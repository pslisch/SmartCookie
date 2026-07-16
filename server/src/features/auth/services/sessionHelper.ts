import { Request, Response } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { User } from '@prisma/client';
import { SESSION_DURATION_MS } from '../../../shared/constants';
import { permissionResolverService } from '../../rbac/services/permissionResolver.service';

export async function issueSession(user: User, req: Request, res: Response) {
  // Update last login timestamp
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Create session in the DB
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS); // 30 days
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    },
  });

  // Set HTTP-only session cookie
  res.cookie('sid', session.id, {
    httpOnly: true,
    secure: true,
    signed: true,
    expires: expiresAt,
    sameSite: 'lax',
  });

  let roleName: string | null = null;
  let effectivePermissions: string[] = [];

  if (updatedUser.isSuperuser) {
    roleName = 'Superuser';
  } else if (updatedUser.roleId) {
    const role = await prisma.role.findUnique({
      where: { id: updatedUser.roleId },
    });
    roleName = role ? role.name : null;
    const permissions = await permissionResolverService.getEffectivePermissions(updatedUser.roleId);
    effectivePermissions = permissions.map((p) => `${p.module}:${p.action}`);
  }

  return {
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      isSuperuser: updatedUser.isSuperuser,
      recoveryEmail: updatedUser.recoveryEmail,
      companyId: updatedUser.companyId,
      status: updatedUser.status,
      roleName,
      effectivePermissions,
    },
  };
}
