import { Card, Group, Stack, Text, Badge, Select, Divider, Box } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconHash, IconListNumbers, IconArrowRight, IconArrowLeft } from '@tabler/icons-react';
import type { NumberingScheme } from '@/types';
import { useMemo } from 'react';

export default function TileNumberingPanel() {
  const { numberingScheme, setNumberingScheme, numberingResult, layout, showTileNumbers, setShowTileNumbers } = useRoofStore();

  const schemeOptions = [
    { value: 'slope-row-col', label: '坡面-行-列' },
    { value: 'row-col', label: '行-列' },
    { value: 'snake-row', label: '蛇形行列' },
  ];

  const sampleTiles = useMemo(() => {
    const row0Tiles = layout.tiles.filter(t => t.row === 0).slice(0, 3);
    const row1Tiles = layout.tiles.filter(t => t.row === 1).slice(0, 3);
    return [...row0Tiles, ...row1Tiles];
  }, [layout.tiles]);

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
          
          {[0, 1].map((rowNum) => {
            const rowTiles = sampleTiles.filter(t => t.row === rowNum);
            if (rowTiles.length === 0) return null;
            const isEvenRow = rowNum % 2 === 1;
            const isSnake = numberingScheme === 'snake-row';
            const direction = isSnake && isEvenRow ? 'right-to-left' : 'left-to-right';
            
            return (
              <Box key={rowNum} style={{ marginBottom: '8px' }}>
                <Group gap="xs" mb="4px">
                  <Badge size="sm" variant="outline" color="gray">
                    第{rowNum + 1}行
                  </Badge>
                  {isSnake && (
                    <Group gap="2px">
                      {direction === 'left-to-right' ? (
                        <IconArrowRight size={12} color="#059669" />
                      ) : (
                        <IconArrowLeft size={12} color="#f59e0b" />
                      )}
                      <Text size="xs" c={direction === 'left-to-right' ? 'green' : 'orange'} fw={500}>
                        {direction === 'left-to-right' ? '从左到右' : '从右到左'}
                      </Text>
                    </Group>
                  )}
                </Group>
                
                {rowTiles.map((tile) => {
                  const num = numberingResult.numberingMap[tile.id];
                  return (
                    <Group key={tile.id} justify="space-between" style={{ padding: '4px 0 4px 16px' }}>
                      <Group gap="xs">
                        <Badge size="sm" variant="light" color={tile.isCut ? 'orange' : 'green'}>
                          {tile.isCut ? '裁切' : '完整'}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          第{tile.col + 1}列
                        </Text>
                      </Group>
                      <Text size="sm" fw={600} c="blue">
                        {num?.displayNumber || tile.id}
                      </Text>
                    </Group>
                  );
                })}
              </Box>
            );
          })}
          
          {layout.tiles.length > sampleTiles.length && (
            <Text size="xs" c="dimmed" ta="center" mt="xs">
              ... 还有 {layout.tiles.length - sampleTiles.length} 块瓦片
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
