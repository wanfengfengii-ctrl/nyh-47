import { Card, Group, Stack, Text, Badge, Select, Divider } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconHash, IconListNumbers } from '@tabler/icons-react';
import type { NumberingScheme } from '@/types';

export default function TileNumberingPanel() {
  const { numberingScheme, setNumberingScheme, numberingResult, layout, showTileNumbers, setShowTileNumbers } = useRoofStore();

  const schemeOptions = [
    { value: 'slope-row-col', label: '坡面-行-列' },
    { value: 'row-col', label: '行-列' },
    { value: 'snake-row', label: '蛇形行列' },
  ];

  const sampleTiles = layout.tiles.slice(0, 3);

  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder p="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconListNumbers size={20} stroke={1.5} />
            <Text fw={600} size="lg">瓦片编号</Text>
          </Group>
          <Badge variant="light" color="blue">
            共 {numberingResult.totalTiles} 块
          </Badge>
        </Group>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="flex-end">
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500} mb="xs">编号规则</Text>
              <Select
                size="sm"
                value={numberingScheme}
                onChange={(v) => v && setNumberingScheme(v as NumberingScheme)}
                data={schemeOptions}
                allowDeselect={false}
              />
            </div>
          </Group>

          <Group justify="space-between">
            <Text size="sm" fw={500}>画布显示编号</Text>
            <Badge
              variant={showTileNumbers ? 'filled' : 'light'}
              color={showTileNumbers ? 'teal' : 'gray'}
              style={{ cursor: 'pointer' }}
              onClick={() => setShowTileNumbers(!showTileNumbers)}
            >
              {showTileNumbers ? '已开启' : '已关闭'}
            </Badge>
          </Group>
        </Stack>
      </Card.Section>

      <Card.Section p="md">
        <Stack gap="sm">
          <Group gap="xs">
            <IconHash size={16} color="#6b7280" />
            <Text size="sm" fw={500}>编号示例</Text>
          </Group>
          <Divider />
          {sampleTiles.map((tile) => {
            const num = numberingResult.numberingMap[tile.id];
            return (
              <Group key={tile.id} justify="space-between" style={{ padding: '6px 0' }}>
                <Group gap="xs">
                  <Badge size="sm" variant="light" color={tile.isCut ? 'orange' : 'green'}>
                    {tile.isCut ? '裁切' : '完整'}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    第{tile.row + 1}行 第{tile.col + 1}列
                  </Text>
                </Group>
                <Text size="sm" fw={600} c="blue">
                  {num?.displayNumber || tile.id}
                </Text>
              </Group>
            );
          })}
          {layout.tiles.length > 3 && (
            <Text size="xs" c="dimmed" ta="center" mt="xs">
              ... 还有 {layout.tiles.length - 3} 块瓦片
            </Text>
          )}
        </Stack>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Stack gap="xs">
          <Text size="xs" fw={500} c="dimmed">编号说明：</Text>
          {numberingScheme === 'slope-row-col' && (
            <Text size="xs" c="dimmed">
              格式 S{1}-R{1}-C{1}：坡面号-行号-列号，适合多坡面屋面。
            </Text>
          )}
          {numberingScheme === 'row-col' && (
            <Text size="xs" c="dimmed">
              格式 R{1}-C{1}：行号-列号，简洁明了，适用于单坡面。
            </Text>
          )}
          {numberingScheme === 'snake-row' && (
            <Text size="xs" c="dimmed">
              蛇形排列：奇数行从左到右，偶数行从右到左，便于流水施工。
            </Text>
          )}
        </Stack>
      </Card.Section>
    </Card>
  );
}
