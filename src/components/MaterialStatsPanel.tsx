import { Card, Group, Stack, Text, Badge, ScrollArea, Progress, Divider, Box } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconPackages, IconScissors, IconSquare, IconEye, IconEyeOff } from '@tabler/icons-react';

export default function MaterialStatsPanel() {
  const { materialStats, setSelectedTile, layout, highlightedMaterialGroupTileIds, setHighlightedMaterialGroupTileIds, clearHighlightedMaterialGroup } = useRoofStore();

  const handleGroupClick = (tileIds: string[]) => {
    const isAlreadyHighlighted = tileIds.length > 0 && highlightedMaterialGroupTileIds.length > 0 && 
      tileIds.every(id => highlightedMaterialGroupTileIds.includes(id));
    
    if (isAlreadyHighlighted) {
      clearHighlightedMaterialGroup();
    } else {
      setHighlightedMaterialGroupTileIds(tileIds);
      if (tileIds.length > 0) {
        setSelectedTile(tileIds[0]);
      }
    }
  };

  const isGroupHighlighted = (tileIds: string[]) => {
    if (tileIds.length === 0 || highlightedMaterialGroupTileIds.length === 0) return false;
    return tileIds.every(id => highlightedMaterialGroupTileIds.includes(id));
  };

  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder p="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconPackages size={20} stroke={1.5} />
            <Text fw={600} size="lg">材料分组统计</Text>
          </Group>
          <Badge variant="light" color="blue">
            {materialStats.summary.totalGroups} 组
          </Badge>
        </Group>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Stack gap="sm">
          <Group grow>
            <div>
              <Text size="sm" c="dimmed">完整瓦组数</Text>
              <Group gap="xs" mt="xs">
                <IconSquare size={16} color="#22c55e" />
                <Text fw={700} c="green" size="xl">
                  {materialStats.fullTileGroups.length}
                </Text>
              </Group>
            </div>
            <div>
              <Text size="sm" c="dimmed">裁切瓦组数</Text>
              <Group gap="xs" mt="xs">
                <IconScissors size={16} color="#f59e0b" />
                <Text fw={700} c="orange" size="xl">
                  {materialStats.cutTileGroups.length}
                </Text>
              </Group>
            </div>
          </Group>

          <Divider />

          <Group justify="space-between">
            <Text size="sm" c="dimmed">材料总面积</Text>
            <Text fw={600}>
              {(materialStats.summary.totalArea / 1000000).toFixed(4)} m²
            </Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">屋面面积</Text>
            <Text fw={600}>
              {(layout.roofArea / 1000000).toFixed(4)} m²
            </Text>
          </Group>
        </Stack>
      </Card.Section>

      <Card.Section p={0}>
        <ScrollArea h={280} type="hover">
          <Stack gap="xs" p="md">
            <Text size="xs" fw={600} c="green" tt="uppercase">
              ■ 完整瓦
            </Text>
            {materialStats.fullTileGroups.map((group) => {
              const percentage = (group.count / materialStats.summary.totalTileCount) * 100;
              const highlighted = isGroupHighlighted(group.tileIds);
              return (
                <Box
                  key={group.groupKey}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: highlighted ? '2px solid #10b981' : '1px solid #dcfce7',
                    background: highlighted ? '#d1fae5' : '#f0fdf4',
                    cursor: 'pointer',
                    boxShadow: highlighted ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                  }}
                  onClick={() => handleGroupClick(group.tileIds)}
                >
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      {highlighted && <IconEye size={14} color="#059669" />}
                      <Text size="sm" fw={500}>
                        {group.groupName}
                      </Text>
                    </Group>
                    <Badge size="sm" variant="filled" color="green">
                      {group.count} 块
                    </Badge>
                  </Group>
                  <Progress value={percentage} size="sm" color="green" mb="xs" />
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      占比 {percentage.toFixed(1)}%
                    </Text>
                    <Text size="xs" c="dimmed">
                      {(group.totalArea / 1000000).toFixed(4)} m²
                    </Text>
                  </Group>
                </Box>
              );
            })}

            {materialStats.cutTileGroups.length > 0 && (
              <>
                <Divider mt="md" />
                <Text size="xs" fw={600} c="orange" tt="uppercase" mt="xs">
                  ■ 裁切瓦
                </Text>
                {materialStats.cutTileGroups.map((group) => {
                  const percentage = (group.count / materialStats.summary.totalTileCount) * 100;
                  const highlighted = isGroupHighlighted(group.tileIds);
                  return (
                    <Box
                      key={group.groupKey}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: highlighted ? '2px solid #10b981' : '1px solid #fef3c7',
                        background: highlighted ? '#d1fae5' : '#fffbeb',
                        cursor: 'pointer',
                        boxShadow: highlighted ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                      }}
                      onClick={() => handleGroupClick(group.tileIds)}
                    >
                      <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                          {highlighted ? <IconEye size={14} color="#059669" /> : <IconScissors size={14} color="#f59e0b" />}
                          <Text size="sm" fw={500}>
                            {group.groupName}
                          </Text>
                        </Group>
                        <Badge size="sm" variant="filled" color="orange">
                          {group.count} 块
                        </Badge>
                      </Group>
                      <Progress value={percentage} size="sm" color={highlighted ? 'green' : 'orange'} mb="xs" />
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">
                          占比 {percentage.toFixed(1)}%
                        </Text>
                        <Text size="xs" c="dimmed">
                          {(group.totalArea / 1000000).toFixed(4)} m²
                        </Text>
                      </Group>
                    </Box>
                  );
                })}
              </>
            )}
          </Stack>
        </ScrollArea>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {highlightedMaterialGroupTileIds.length > 0 
              ? `已高亮 ${highlightedMaterialGroupTileIds.length} 块瓦片，再次点击可取消`
              : '点击分组可高亮整组瓦片'}
          </Text>
          {highlightedMaterialGroupTileIds.length > 0 && (
            <Badge 
              size="sm" 
              variant="light" 
              color="gray" 
              style={{ cursor: 'pointer' }}
              onClick={clearHighlightedMaterialGroup}
            >
              <Group gap="xs">
                <IconEyeOff size={12} />
                清除高亮
              </Group>
            </Badge>
          )}
        </Group>
      </Card.Section>
    </Card>
  );
}
