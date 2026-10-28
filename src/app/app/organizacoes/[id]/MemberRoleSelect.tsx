'use client';

import { useRef } from 'react';
import { changeMemberRole } from '@/app/app/actions';
import { MEMBER_ROLES, MEMBER_ROLE_LABELS, roleDescription, type MemberRole, type OrgKind } from '@/domain/organization';
import { selectClass } from '@/components/Field';

/**
 * Mudar o papel de um colega, direto na linha de "Equipa online" (26/10/2026, docs/DECISOES.md):
 * muda-se o `<select>` e submete-se logo, sem botão à parte. Só aparece a quem já vê a opção (o
 * proprietário, numa linha que não é a sua própria — decidido na página) e nunca oferece 'proprietario'.
 */
export function MemberRoleSelect({ orgId, userId, orgKind, role }: { orgId: string; userId: string; orgKind: OrgKind; role: MemberRole }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={changeMemberRole.bind(null, orgId, userId)}>
      <select
        name="role"
        defaultValue={role}
        onChange={() => ref.current?.requestSubmit()}
        aria-label="Papel"
        className={`${selectClass} min-h-[44px] py-1.5`}
      >
        {MEMBER_ROLES.filter((r) => r !== 'proprietario').map((r) => (
          <option key={r} value={r} title={roleDescription(orgKind, r)}>
            {MEMBER_ROLE_LABELS[r].label}
          </option>
        ))}
      </select>
    </form>
  );
}
