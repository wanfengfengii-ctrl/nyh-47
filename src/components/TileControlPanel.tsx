import { Card, Group, NumberInput, Select, Stack, Text } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { validateTileParams } from '@/domains/layout';
import { IconLayoutGrid } from '@tabler/icons-react';
import { type TileParams } from '@/types';

export default function TileControlPanel() {
  const { tiles, setTiles } = useRoofStore();
  const errors = validateTileParams(tiles);
  const hasErrors = errors.length > 0;

  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder p="md">
        <Group gap="sm">
          <IconLayoutGrid size={20} stroke={1.5} />
          <Text fw={600} size="lg">瓦片参数</Text>
        </Group>
      </Card.Section>

      <Card.Section p="md">
        <Stack gap="md">
          <Select
            label="瓦型"
            value={tiles.tileType}
            onChange={(value) => setTiles({ tileType: value as TileParams['tileType'] })}
            data={[
              { value: 'round', label: '筒瓦' },
              { value: 'flat', label: '板瓦' },
            ]}
          />

          <Group grow>
            <NumberInput
              label="瓦片宽度 (mm)"
              value={tiles.width}
              onChange={(value) => setTiles({ width: Number(value) || 0 })}
              min={1}
              error={hasErrors && tiles.width <= 0}
            />
            <NumberInput
              label="瓦片长度 (mm)"
              value={tiles.length}
              onChange={(value) => setTiles({ length: Number(value) || 0 })}
              min={1}
              error={hasErrors && tiles.length <= 0}
            />
          </Group>

          <Text size="sm" fw={500} mt="xs">搭接距离</Text>

          <Group grow>
            <NumberInput
              label="横向搭接 (mm)"
              value={tiles.overlapX}
              onChange={(value) => setTiles({ overlapX: Number(value) || 0 })}
              min={1}
              error={hasErrors && tiles.overlapX <= 0}
              description="水平方向瓦片重叠"
            />
            <NumberInput
              label="纵向搭接 (mm)"
              value={tiles.overlapY}
              onChange={(value) => setTiles({ overlapY: Number(value) || 0 })}
              min={1}
              error={hasErrors && tiles.overlapY <= 0}
              description="垂直方向瓦片重叠"
            />
          </Group>

          <Text size="sm" fw={500} mt="xs">最小搭接距离</Text>

          <Group grow>
            <NumberInput
              label="最小横向 (mm)"
              value={tiles.minOverlapX}
              onChange={(value) => setTiles({ minOverlapX: Number(value) || 0 })}
              min={0}
              description="允许的最小横向搭接"
            />
            <NumberInput
              label="最小纵向 (mm)"
              value={tiles.minOverlapY}
              onChange={(value) => setTiles({ minOverlapY: Number(value) || 0 })}
              min={0}
              description="允许的最小纵向搭接"
            />
          </Group>

          {hasErrors && (
            <Text size="sm" c="red">
              {errors.join('；')}
            </Text>
          )}
        </Stack>
      </Card.Section>
    </Card>
  );
}
