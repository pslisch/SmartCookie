import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';

export interface ScormManifestInfo {
  title: string;
  launchFile: string;
  schema?: string;
  schemaVersion?: string;
  description?: string;
  language?: string;
  author?: string;
  rawManifest: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

/**
 * Wraps a value in an array if it isn't one already.
 */
function getArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

/**
 * Searches properties on an object ignoring casing and namespace prefixes (e.g. imscp:organizations -> organizations).
 */
function getPropertyIgnoreCaseAndNamespace(obj: any, key: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const lowerKey = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    const cleanK = k.split(':').pop()?.toLowerCase();
    if (cleanK === lowerKey) {
      return obj[k];
    }
  }
  return undefined;
}

/**
 * Searches attributes on an XML node ignoring casing and prefixes (e.g. @_adlcp:scormtype -> scormtype).
 */
function getAttributeIgnoreCaseAndNamespace(obj: any, attrName: string): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const lowerAttr = attrName.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.startsWith('@_')) {
      const cleanK = k.slice(2).split(':').pop()?.toLowerCase();
      if (cleanK === lowerAttr) {
        return String(obj[k]);
      }
    }
  }
  return undefined;
}

/**
 * Recursively retrieves all <item> elements in a node.
 */
function findItems(node: any): any[] {
  const items: any[] = [];
  const rawItems = getArray(getPropertyIgnoreCaseAndNamespace(node, 'item'));
  for (const item of rawItems) {
    items.push(item);
    items.push(...findItems(item));
  }
  return items;
}

/**
 * Finds the default launch item reference and title in the manifest.
 */
function getDefaultLaunchItemRef(manifestObj: any): { refId: string; title: string } | null {
  const manifest = getPropertyIgnoreCaseAndNamespace(manifestObj, 'manifest');
  if (!manifest) return null;
  
  const organizationsNode = getPropertyIgnoreCaseAndNamespace(manifest, 'organizations');
  if (!organizationsNode) return null;
  
  const defaultOrgId = getAttributeIgnoreCaseAndNamespace(organizationsNode, 'default');
  const orgList = getArray(getPropertyIgnoreCaseAndNamespace(organizationsNode, 'organization'));
  
  let targetOrg = orgList[0];
  if (defaultOrgId) {
    const matched = orgList.find(org => getAttributeIgnoreCaseAndNamespace(org, 'id') === defaultOrgId);
    if (matched) {
      targetOrg = matched;
    }
  }
  
  if (!targetOrg) return null;
  
  const allItems = findItems(targetOrg);
  for (const item of allItems) {
    const refId = getAttributeIgnoreCaseAndNamespace(item, 'identifierref');
    if (refId) {
      const titleNode = getPropertyIgnoreCaseAndNamespace(item, 'title');
      const title = typeof titleNode === 'string' ? titleNode : (typeof titleNode === 'object' && titleNode ? String(titleNode['#text'] || '') : '');
      return { refId, title: title.trim() };
    }
  }
  
  return null;
}

/**
 * Gets the href attribute of the resource with the specified identifier.
 */
function getResourceHref(manifestObj: any, refId: string): string | null {
  const manifest = getPropertyIgnoreCaseAndNamespace(manifestObj, 'manifest');
  if (!manifest) return null;
  
  const resourcesNode = getPropertyIgnoreCaseAndNamespace(manifest, 'resources');
  if (!resourcesNode) return null;
  
  const resourceList = getArray(getPropertyIgnoreCaseAndNamespace(resourcesNode, 'resource'));
  const matchedResource = resourceList.find(res => getAttributeIgnoreCaseAndNamespace(res, 'identifier') === refId);
  
  if (matchedResource) {
    const href = getAttributeIgnoreCaseAndNamespace(matchedResource, 'href');
    if (href) return href;
  }
  
  return null;
}

/**
 * Fallback to find any resource with an href attribute.
 */
function getFirstResourceWithHref(manifestObj: any): string | null {
  const manifest = getPropertyIgnoreCaseAndNamespace(manifestObj, 'manifest');
  if (!manifest) return null;
  
  const resourcesNode = getPropertyIgnoreCaseAndNamespace(manifest, 'resources');
  if (!resourcesNode) return null;
  
  const resourceList = getArray(getPropertyIgnoreCaseAndNamespace(resourcesNode, 'resource'));
  for (const res of resourceList) {
    const href = getAttributeIgnoreCaseAndNamespace(res, 'href');
    if (href) return href;
  }
  
  return null;
}

/**
 * Extracts organization level title.
 */
function getOrganizationTitle(manifestObj: any): string | null {
  const manifest = getPropertyIgnoreCaseAndNamespace(manifestObj, 'manifest');
  if (!manifest) return null;
  
  const organizationsNode = getPropertyIgnoreCaseAndNamespace(manifest, 'organizations');
  if (!organizationsNode) return null;
  
  const orgList = getArray(getPropertyIgnoreCaseAndNamespace(organizationsNode, 'organization'));
  if (orgList.length > 0) {
    const titleNode = getPropertyIgnoreCaseAndNamespace(orgList[0], 'title');
    if (typeof titleNode === 'string') return titleNode.trim();
    if (titleNode && typeof titleNode === 'object') {
      const text = titleNode['#text'] || Object.values(titleNode).find(v => typeof v === 'string');
      if (text) return String(text).trim();
    }
  }
  return null;
}

/**
 * Parsers SCORM 1.2 imsmanifest.xml from the extracted directory.
 */
export function parseManifest(extractedDir: string): ScormManifestInfo {
  const manifestPath = path.join(extractedDir, 'imsmanifest.xml');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('imsmanifest.xml not found in package root');
  }
  
  const xmlData = fs.readFileSync(manifestPath, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });
  
  const rawManifest = parser.parse(xmlData);
  const manifest = getPropertyIgnoreCaseAndNamespace(rawManifest, 'manifest');
  if (!manifest) {
    throw new Error('Invalid manifest: root <manifest> element not found');
  }
  
  // Extract Schema & SchemaVersion
  const metadataNode = getPropertyIgnoreCaseAndNamespace(manifest, 'metadata');
  let schema: string | undefined;
  let schemaVersion: string | undefined;
  if (metadataNode) {
    const schemaNode = getPropertyIgnoreCaseAndNamespace(metadataNode, 'schema');
    const schemaVersionNode = getPropertyIgnoreCaseAndNamespace(metadataNode, 'schemaversion');
    
    schema = typeof schemaNode === 'string' || typeof schemaNode === 'number' || typeof schemaNode === 'boolean'
      ? String(schemaNode)
      : (schemaNode && typeof schemaNode === 'object' ? String(schemaNode['#text'] || '') : undefined);
    schemaVersion = typeof schemaVersionNode === 'string' || typeof schemaVersionNode === 'number' || typeof schemaVersionNode === 'boolean'
      ? String(schemaVersionNode)
      : (schemaVersionNode && typeof schemaVersionNode === 'object' ? String(schemaVersionNode['#text'] || '') : undefined);
  }
  
  // Resolve launch file
  let launchFile = '';
  let title = '';
  
  const defaultLaunchItem = getDefaultLaunchItemRef(rawManifest);
  if (defaultLaunchItem) {
    const href = getResourceHref(rawManifest, defaultLaunchItem.refId);
    if (href) {
      launchFile = href;
    }
    title = defaultLaunchItem.title;
  }
  
  // Fallback 1: Organization title
  if (!title) {
    title = getOrganizationTitle(rawManifest) || '';
  }
  
  // Fallback 2: First resource with href
  if (!launchFile) {
    launchFile = getFirstResourceWithHref(rawManifest) || '';
  }
  
  // Fallback 3: Defaults
  if (!title) {
    title = 'Untitled SCORM Package';
  }
  
  return {
    title: title.trim(),
    launchFile: launchFile.trim(),
    schema: schema?.trim(),
    schemaVersion: schemaVersion?.trim(),
    rawManifest
  };
}

/**
 * Validates SCORM 1.2 content package structures inside an extracted directory.
 * Returns a detailed structured diagnostic result.
 */
export function validate(extractedDir: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];
  
  const manifestPath = path.join(extractedDir, 'imsmanifest.xml');
  if (!fs.existsSync(manifestPath)) {
    return {
      valid: false,
      errors: ['imsmanifest.xml not found in the root of the uploaded package.'],
      warnings: [],
      info: []
    };
  }
  
  try {
    const manifestInfo = parseManifest(extractedDir);
    
    info.push(`Manifest parsed successfully. Title: "${manifestInfo.title}"`);
    
    if (manifestInfo.schema) {
      info.push(`Schema: ${manifestInfo.schema}`);
    }
    if (manifestInfo.schemaVersion) {
      info.push(`Schema Version: ${manifestInfo.schemaVersion}`);
      
      const ver = manifestInfo.schemaVersion.toLowerCase();
      if (ver.includes('2004') || ver.includes('1.3')) {
        warnings.push(`The manifest indicates SCORM 2004 (${manifestInfo.schemaVersion}). Only SCORM 1.2 is fully supported by this engine.`);
      }
    } else {
      warnings.push('Manifest does not specify a schema version. Defaulting SCORM resolution to 1.2 compatibility mode.');
    }
    
    if (!manifestInfo.launchFile) {
      errors.push('No launch file (resource href) could be resolved from the manifest.');
    } else {
      // Clean query parameters/hash anchors for file existence check
      const cleanLaunchPath = manifestInfo.launchFile.split(/[?#]/)[0];
      const fullLaunchPath = path.resolve(extractedDir, cleanLaunchPath);
      
      // Safety check: ensure resolved path doesn't escape extractedDir
      if (!fullLaunchPath.startsWith(path.resolve(extractedDir) + path.sep)) {
        errors.push(`Security threat: Resolved launch file path "${cleanLaunchPath}" attempts to traverse out of the content directory.`);
      } else if (!fs.existsSync(fullLaunchPath)) {
        errors.push(`Launch file "${cleanLaunchPath}" specified in imsmanifest.xml does not exist in the extracted package files.`);
      } else {
        info.push(`Launch file is valid: "${cleanLaunchPath}"`);
      }
    }
    
    const valid = errors.length === 0;
    return {
      valid,
      errors,
      warnings,
      info
    };
    
  } catch (err: any) {
    return {
      valid: false,
      errors: [`Manifest validation failed: ${err.message}`],
      warnings: [],
      info: []
    };
  }
}
