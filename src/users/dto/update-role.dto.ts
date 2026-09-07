import {
  IsIn,
} from 'class-validator';

import type { UserRole } from '../user-role.type';

export class UpdateRoleDto {
  @IsIn([
    'customer',
    'worker',
    'manager',
  ])
  role!: UserRole;
}