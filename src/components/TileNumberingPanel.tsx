import { Card, Group, Stack, Text, Badge, Select, Divider, Box, ScrollArea, TextInput, ActionIcon, Tooltip } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconHash, IconListNumbers, IconArrowRight, IconArrowLeft, IconSearch, IconFocus, IconCheck } from '@tabler/icons-react';
import type { NumberingScheme } from '@/types';
import { useMemo, useState } from 'react';

export default function TileNumberingPanel() {
  const {
    numberingScheme,
    setNumberingScheme,
    numberingResult,
    layout,
    showTileNumbers,
    setShowTileNumbers,
    focusAndHighlightTile,
    focusedTileId,
    setSelectedTile,
  } = useRoofStore();

  const [searchKeyword, setSearchKeyword] = useState('');

  const schemeOptions = [
    { value: 'slope-row-col', label: '坡面-行-列' },
    { value: 'row-col', label: '行-列' },
    { value: 'snake-row', label: '蛇形行列' },
  ];

  const sampleRows = useMemo(() => {
    const rows = new Map<number, typeof layout.tiles>();
    layout.tiles.forEach(tile => {
      if (!rows.has(tile.row)) {
        rows.set(tile.row, []);
      }
      rows.get(tile.row)!.push(tile);
    });
    const sortedRowKeys = Array.from(rows.keys()).sort((a, b) => a - b);
    return sortedRowKeys.slice(0, 4).map(rowNum => {
      const rowTiles = rows.get(rowNum)!.sort((a, b) => a.col - b.col);
      return { rowNum, tiles: rowTiles };
    });
  }, [layout.tiles]);

  const filteredNumbering = useMemo(() => {
    if (!searchKeyword.trim()) return [];
    const kw = searchKeyword.toLowerCase();
    return Object.values(numberingResult.numberingMap)
      .filter(n =>
        n.displayNumber.toLowerCase().includes(kw) ||
        String(n.rowNumber).includes(kw) ||
        String(n.colNumber).includes(kw) ||
        n.tileId.toLowerCase().includes(kw)
      )
      .slice(0, 10);
  }, [numberingResult.numberingMap, searchKeyword]);

  const handleTileClick = (tileId: string) => {
    focusAndHighlightTile(tileId);
  };

  const renderSnakeVisualization = () => {
    if (sampleRows.length === 0) return null;

    return (
      <Stack gap="xs" mt="sm">
        <Group gap="xs" mb="4px">
          <IconHash size={16} color="#6b7280" />
          <Text size="sm" fw={500}>蛇形编号示意图</Text>
        </Group>
        <Divider />

        <Box style={{
          background: '#f8fafc',
          borderRadius: 8,
          padding: 12,
          border: '1px solid #e2e8f0',
        }}>
          {sampleRows.map(({ rowNum, tiles }) => {
            const isEvenRow = rowNum % 2 === 1;
            const isSnake = numberingScheme === 'snake-row';
            const direction = isSnake && isEvenRow ? 'right-to-left' : 'left-to-right';
            const displayTiles = isSnake && isEvenRow ? [...tiles].reverse() : tiles;
            const sampleTiles = displayTiles.slice(0, 6);

            return (
              <Box key={rowNum} mb={rowNum < sampleRows.length - 1 ? 8 : 0}>
                <Group justify="space-between" mb={4}>
                  <Badge size="xs" variant="outline" color="gray">
                    第{rowNum + 1}行
                  </Badge>
                  {isSnake && (
                    <Group gap="2px">
                      {direction === 'left-to-right' ? (
                        <IconArrowRight size={12} color="#059669" />
                      ) : (
                        <IconArrowLeft size={12} color="#f59e0b" />
                      )}
                      <Text size="10px" c={direction === 'left-to-right' ? 'green' : 'orange'} fw={500}>
                        {direction === 'left-to-right' ? '左→右' : '右→左'}
                      </Text>
                    </Group>
                  )}
                </Group>

                <Group gap={4} wrap="nowrap" style={{ overflow: 'hidden' }}>
                  {sampleTiles.map((tile) => {
                    const num = numberingResult.numberingMap[tile.id];
                    const isFocused = focusedTileId === tile.id;
                    return (
                      <Tooltip key={tile.id} label={`点击定位: ${num?.displayNumber || tile.id}`}>
                        <Box
                          style={{
                            minWidth: 48,
                            height: 32,
                            background: tile.isCut ? '#fef3c7' : '#dcfce7',
                            border: isFocused ? '2px solid #3b82f6' : '1px solid #d1d5db',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 600,
                            color: tile.isCut ? '#92400e' : '#166534',
                            cursor: 'pointer',
                            boxShadow: isFocused ? '0 0 6px rgba(59,130,246,0.5)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onClick={() => handleTileClick(tile.id)}
                        >
                          {num ? num.colNumber : '?'}
                        </Box>
                      </Tooltip>
                    );
                  })}
                  {tiles.length > 6 && (
                    <Text size="10px" c="dimmed" ml={4}>
                      +{tiles.length - 6}
                    </Text>
                  )}
                </Group>

                {isSnake && rowNum < sampleRows.length - 1 && (
                  <Box style={{ display: 'flex', justifyContent: isEvenRow ? 'flex-start' : 'flex-end', margin: '2px 8px' }}>
                    <Text size="10px" c="dimmed">↕</Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        <Text size="10px" c="dimmed" ta="center" mt="xs">
          点击方格可在画布上定位对应瓦片
        </Text>
      </Stack>
    );
  };

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

          <TextInput
            size="xs"
            placeholder="搜索编号/行列/ID..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            leftSection={<IconSearch size={14} />}
          />

          {searchKeyword.trim() && filteredNumbering.length > 0 && (
            <ScrollArea h={120} type="hover">
              <Stack gap="xs">
                {filteredNumbering.map((num) => (
                  <Group
                    key={num.tileId}
                    justify="space-between"
                    style={{
                      padding: '6px 8px',
                      background: focusedTileId === num.tileId ? '#dbeafe' : '#f1f5f9',
                      borderRadius: 6,
                      cursor: 'pointer',
                      border: `1px solid ${focusedTileId === num.tileId ? '#3b82f6' : '#e2e8f0'}`,
                    }}
                    onClick={() => handleTileClick(num.tileId)}
                  >
                    <Group gap="xs">
                      {focusedTileId === num.tileId && <IconCheck size={12} color="#3b82f6" />}
                      <Text size="xs" fw={600} c="blue">
                        {num.displayNumber}
                      </Text>
                    </Group>
                    <Text size="10px" c="dimmed">
                      R{num.rowNumber} C{num.colNumber}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </ScrollArea>
          )}

          {searchKeyword.trim() && filteredNumbering.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" py="xs">
              未找到匹配的瓦片
            </Text>
          )}
        </Stack>
      </Card.Section>

      <Card.Section p="md">
        {numberingScheme === 'snake-row' ? (
          renderSnakeVisualization()
        ) : (
          <Stack gap="sm">
            <Group gap="xs">
              <IconHash size={16} color="#6b7280" />
              <Text size="sm" fw={500}>编号示例</Text>
            </Group>
            <Divider />

            {sampleRows.slice(0, 2).map(({ rowNum, tiles }) => {
              const rowTiles = tiles.slice(0, 3);
              if (rowTiles.length === 0) return null;

              return (
                <Box key={rowNum} style={{ marginBottom: '8px' }}>
                  <Group gap="xs" mb="4px">
                    <Badge size="sm" variant="outline" color="gray">
                      第{rowNum + 1}行
                    </Badge>
                  </Group>

                  {rowTiles.map((tile) => {
                    const num = numberingResult.numberingMap[tile.id];
                    const isFocused = focusedTileId === tile.id;
                    return (
                      <Group
                        key={tile.id}
                        justify="space-between"
                        style={{
                          padding: '4px 0 4px 16px',
                          cursor: 'pointer',
                          borderRadius: 4,
                          background: isFocused ? '#dbeafe' : 'transparent',
                        }}
                        onClick={() => handleTileClick(tile.id)}
                      >
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

            {layout.tiles.length > 6 && (
              <Text size="xs" c="dimmed" ta="center" mt="xs">
                ... 还有 {layout.tiles.length - 6} 块瓦片
              </Text>
            )}
          </Stack>
        )}
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Stack gap="xs">
          <Text size="xs" fw={500} c="dimmed">编号说明：</Text>
          {numberingScheme === 'slope-row-col' && (
            <Text size="xs" c="dimmed">
              格式 S1-R1-C1：坡面号-行号-列号，适合多坡面屋面。
            </Text>
          )}
          {numberingScheme === 'row-col' && (
            <Text size="xs" c="dimmed">
              格式 R1-C1：行号-列号，简洁明了，适用于单坡面。
            </Text>
          )}
          {numberingScheme === 'snake-row' && (
            <Text size="xs" c="dimmed">
              蛇形排列：奇数行从左到右，偶数行从右到左，便于流水施工。
            </Text>
          )}
          <Group gap="xs" mt="4px">
            <IconFocus size={12} color="#3b82f6" />
            <Text size="10px" c="blue">
              点击编号可在画布上定位高亮
            </Text>
          </Group>
        </Stack>
      </Card.Section>
    </Card>
  );
}
