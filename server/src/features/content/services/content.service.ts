import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { prisma } from '../../../shared/db/prisma.js';
import { extractZip, getContentStorageRoot, getContentDir } from './contentStorage.service.js';
import { parseManifest, validate } from '../providers/scorm12.provider.js';

export interface ImportPackageMetadata {
  title?: string;
  description?: string;
  categoryId?: string | null;
  author?: string;
  language?: string;
  companyId: string;
  tags?: string[];
}

export class ContentService {
  /**
   * Imports a SCORM 1.2 package from a zip buffer.
   * If the package is invalid, returns validation errors and does not persist anything.
   */
  async importPackage(
    zipBuffer: Buffer,
    metadata: ImportPackageMetadata,
    versionBehavior: 'NEW' | 'REPLACE',
    existingContentGroupId: string | null | undefined,
    createdById: string
  ) {
    const contentId = crypto.randomUUID();
    const storageRoot = getContentStorageRoot();
    
    // Create dedicated directories under storage root
    const zipDir = path.join(storageRoot, 'zips');
    fs.mkdirSync(zipDir, { recursive: true });
    
    const zipPath = path.join(zipDir, `${contentId}.zip`);
    fs.writeFileSync(zipPath, zipBuffer);
    
    const extractedDir = getContentDir(contentId);
    
    try {
      // 1. Extract zip with path-traversal protection
      extractZip(zipPath, contentId);
      
      // 2. Validate SCORM structure
      const validation = validate(extractedDir);
      if (!validation.valid) {
        // Clean up extracted files and zip if invalid
        if (fs.existsSync(extractedDir)) {
          fs.rmSync(extractedDir, { recursive: true, force: true });
        }
        if (fs.existsSync(zipPath)) {
          fs.rmSync(zipPath, { force: true });
        }
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
          info: validation.info
        };
      }
      
      // Parse manifest metadata
      const manifestInfo = parseManifest(extractedDir);
      
      // 3. Versioning strategy
      let contentGroupId = existingContentGroupId;
      let version = 1;
      
      if (versionBehavior === 'REPLACE' && contentGroupId) {
        // Find existing max version in this contentGroupId
        const existingVersions = await prisma.content.findMany({
          where: { contentGroupId },
          select: { version: true }
        });
        if (existingVersions.length > 0) {
          const maxVersion = Math.max(...existingVersions.map(c => c.version));
          version = maxVersion + 1;
        }
      } else {
        // Either NEW behavior or no contentGroupId was supplied -> generate new contentGroupId
        contentGroupId = crypto.randomUUID();
      }
      
      // Determine final title/description (prefer explicit metadata, fallback to manifest, then fallback to default)
      const finalTitle = metadata.title?.trim() || manifestInfo.title || 'Untitled SCORM Package';
      const finalDescription = metadata.description?.trim() || manifestInfo.description || '';
      const finalAuthor = metadata.author?.trim() || manifestInfo.author || null;
      const finalLanguage = metadata.language?.trim() || manifestInfo.language || null;
      
      // Create Content record in DB
      const content = await prisma.content.create({
        data: {
          id: contentId,
          companyId: metadata.companyId,
          providerType: 'SCORM_1_2',
          title: finalTitle,
          description: finalDescription,
          categoryId: metadata.categoryId || null,
          author: finalAuthor,
          language: finalLanguage,
          version,
          contentGroupId,
          status: 'DRAFT',
          storagePathZip: zipPath,
          storagePathExtracted: extractedDir,
          launchFile: manifestInfo.launchFile,
          manifestData: manifestInfo.rawManifest as any,
          createdById,
          tags: metadata.tags && metadata.tags.length > 0 ? {
            create: metadata.tags.map(tag => ({ tag }))
          } : undefined
        },
        include: {
          tags: true
        }
      });
      
      return {
        success: true,
        content,
        warnings: validation.warnings,
        info: validation.info
      };
      
    } catch (err: any) {
      // Cleanup on any uncaught crash/error during process
      if (fs.existsSync(extractedDir)) {
        fs.rmSync(extractedDir, { recursive: true, force: true });
      }
      if (fs.existsSync(zipPath)) {
        fs.rmSync(zipPath, { force: true });
      }
      throw err;
    }
  }

  /**
   * Publishes a content version, setting status to PUBLISHED.
   * If this is a new version replacing a previously-published one in the same contentGroupId,
   * updates every Lesson.contentId currently pointing at any OLD version of this contentGroupId to point at this new one.
   */
  async publishContent(contentId: string) {
    const content = await prisma.content.findUnique({
      where: { id: contentId }
    });
    
    if (!content) {
      throw new Error(`Content with ID ${contentId} not found.`);
    }
    
    if (content.status === 'PUBLISHED') {
      return content;
    }
    
    // Begin transaction to update status and repoint lessons
    return await prisma.$transaction(async (tx) => {
      // 1. Update status to PUBLISHED
      const updated = await tx.content.update({
        where: { id: contentId },
        data: { status: 'PUBLISHED' }
      });
      
      // 2. Repoint all lessons referencing older versions of the same contentGroupId
      // Find all content IDs in this group that are NOT the new published one
      const oldContentsInGroup = await tx.content.findMany({
        where: {
          contentGroupId: content.contentGroupId,
          id: { not: contentId }
        },
        select: { id: true }
      });
      
      if (oldContentsInGroup.length > 0) {
        const oldContentIds = oldContentsInGroup.map(c => c.id);
        
        await tx.lesson.updateMany({
          where: {
            contentId: { in: oldContentIds }
          },
          data: {
            contentId: contentId
          }
        });
      }
      
      return updated;
    });
  }

  /**
   * Archives a content package (status to ARCHIVED)
   */
  async archiveContent(contentId: string) {
    const content = await prisma.content.findUnique({
      where: { id: contentId }
    });
    if (!content) {
      throw new Error(`Content with ID ${contentId} not found.`);
    }
    return await prisma.content.update({
      where: { id: contentId },
      data: { status: 'ARCHIVED' }
    });
  }

  /**
   * Restores an archived content package back to DRAFT or PUBLISHED
   */
  async restoreContent(contentId: string, targetStatus: 'DRAFT' | 'PUBLISHED' = 'DRAFT') {
    const content = await prisma.content.findUnique({
      where: { id: contentId }
    });
    if (!content) {
      throw new Error(`Content with ID ${contentId} not found.`);
    }
    return await prisma.content.update({
      where: { id: contentId },
      data: { status: targetStatus }
    });
  }

  // --- CONTENT CATEGORY METHODS ---

  async createCategory(name: string, parentCategoryId: string | null | undefined, companyId: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Category name is required.');
    }
    
    if (parentCategoryId) {
      const parent = await prisma.contentCategory.findFirst({
        where: { id: parentCategoryId }
      });
      if (!parent) {
        throw new Error(`Parent category with ID ${parentCategoryId} not found.`);
      }
    }
    
    return await prisma.contentCategory.create({
      data: {
        name: trimmedName,
        companyId,
        parentCategoryId: parentCategoryId || null
      }
    });
  }

  async renameCategory(id: string, newName: string) {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      throw new Error('New name is required.');
    }
    
    const category = await prisma.contentCategory.findUnique({
      where: { id }
    });
    if (!category) {
      throw new Error(`Category with ID ${id} not found.`);
    }
    
    return await prisma.contentCategory.update({
      where: { id },
      data: { name: trimmedName }
    });
  }

  async moveCategory(id: string, newParentCategoryId: string | null) {
    const category = await prisma.contentCategory.findUnique({
      where: { id }
    });
    if (!category) {
      throw new Error(`Category with ID ${id} not found.`);
    }
    
    if (newParentCategoryId !== null) {
      if (newParentCategoryId === id) {
        throw new Error('A category cannot be its own parent.');
      }
      
      // Cycle detection: walk ancestors of the proposed parent category
      let currentId: string | null = newParentCategoryId;
      const visited = new Set<string>();
      
      while (currentId) {
        if (currentId === id) {
          throw new Error('Circular dependency detected: Setting this parent would create a loop in the content category hierarchy.');
        }
        if (visited.has(currentId)) {
          break;
        }
        visited.add(currentId);
        
        const parentCat = await prisma.contentCategory.findUnique({
          where: { id: currentId }
        });
        if (!parentCat) {
          throw new Error(`Parent category with ID ${currentId} not found.`);
        }
        currentId = parentCat.parentCategoryId;
      }
    }
    
    return await prisma.contentCategory.update({
      where: { id },
      data: { parentCategoryId: newParentCategoryId }
    });
  }

  async deleteCategory(id: string) {
    const category = await prisma.contentCategory.findUnique({
      where: { id },
      include: {
        childCategories: true,
        contents: true
      }
    });
    
    if (!category) {
      throw new Error(`Category with ID ${id} not found.`);
    }
    
    if (category.childCategories.length > 0) {
      throw new Error('Cannot delete category because it has subcategories associated with it.');
    }
    
    if (category.contents.length > 0) {
      throw new Error('Cannot delete category because there are active content packages associated with it.');
    }
    
    return await prisma.contentCategory.delete({
      where: { id }
    });
  }
}
