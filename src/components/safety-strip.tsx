import { View } from 'react-native';

import { ESSENTIAL_DOC_TYPES } from '@/lib/catalog';
import type { DocType } from '@/lib/types';
import { radius, space, usePalette } from '@/theme/tokens';
import { Text } from './ui';

const SHORT: Partial<Record<DocType, string>> = {
  health_policy: 'Health',
  term_policy: 'Term',
  id_document: 'ID',
};

/**
 * The app's signature element: one segment per essential document type.
 * Filled lime when it is in the vault, an open amber outline when missing.
 */
export function SafetyStrip({ present, compact = false }: { present: DocType[]; compact?: boolean }) {
  const p = usePalette();
  const have = new Set(present);
  return (
    <View
      accessibilityLabel={`Essentials in vault: ${present.length} of ${ESSENTIAL_DOC_TYPES.length}`}
      style={{ flexDirection: 'row', gap: space.xs }}>
      {ESSENTIAL_DOC_TYPES.map((t) => {
        const ok = have.has(t);
        return (
          <View key={t} style={{ flex: 1, gap: 4 }}>
            <View
              style={{
                height: compact ? 6 : 10,
                borderRadius: radius.pill,
                backgroundColor: ok ? p.lime : p.amberWash,
                borderWidth: ok ? 0 : 1.5,
                borderColor: p.amber,
                borderStyle: ok ? 'solid' : 'dashed',
              }}
            />
            {compact ? null : (
              <Text variant="caption" tone={ok ? 'soft' : 'faint'}>
                {SHORT[t]}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
