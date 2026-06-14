import {
  Card,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  Switch,
  TextInput,
  Checkbox,
  Divider,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Modal,
  Box,
} from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import {
  IconPrinter,
  IconFileExport,
  IconRefresh,
  IconSearch,
  IconX,
  IconListNumbers,
  IconListCheck,
  IconPackages,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { useState } from 'react';
import type { Tile } from '@/types';
import { useChecklistFilter } from '@/hooks/useChecklistFilter';

export default function ConstructionListPanel() {
  const printFilteredConstructionList = useRoofStore(
    (s) => s.printFilteredConstructionList
  );
  const printConstructionList = useRoofStore((s) => s.printConstructionList);
  const focusAndHighlightTile = useRoofStore((s) => s.focusAndHighlightTile);
  const focusedTileId = useRoofStore((s) => s.focusedTileId);
  const numberingResult = useRoofStore((s) => s.numberingResult);
  const layout = useRoofStore((s) => s.layout);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [showStepSelector, setShowStepSelector] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const filter = useChecklistFilter(searchKeyword);

  const handleTileClick = (tile: Tile) => {
    focusAndHighlightTile(tile.id);
  };

  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder p="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconPrinter size={20} stroke={1.5} />
            <Text fw={600} size="lg">施工清单</Text>
          </Group>
          <Badge variant="light" color="blue">
            {filter.filteredTiles.length} 块
          </Badge>
        </Group>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Stack gap="sm">
          <TextInput
            size="xs"
            placeholder="搜索编号/行列/ID..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            leftSection={<IconSearch size={14} />}
            rightSection={
              searchKeyword ? (
                <ActionIcon size="xs" variant="transparent" onClick={() => setSearchKeyword('')}>
                  <IconX size={14} />
                </ActionIcon>
              ) : null
            }
          />

          <Group gap="xs">
            <Switch
              size="xs"
              checked={filter.filter.includeFullTiles}
              onChange={(e) => filter.setFilter({ includeFullTiles: e.currentTarget.checked })}
              label={
                <Text size="xs" c="green">
                  完整瓦
                </Text>
              }
            />
            <Switch
              size="xs"
              checked={filter.filter.includeCutTiles}
              onChange={(e) => filter.setFilter({ includeCutTiles: e.currentTarget.checked })}
              label={
                <Text size="xs" c="orange">
                  裁切瓦
                </Text>
              }
            />
          </Group>

          <Divider />

          <Group justify="space-between">
            <Group gap="xs">
              <IconPackages size={14} color="#f59e0b" />
              <Text size="xs" fw={500}>
                材料分组筛选
              </Text>
              {filter.filter.selectedGroups.length > 0 && (
                <Badge size="xs" variant="light" color="orange">
                  {filter.filter.selectedGroups.length}/{filter.filteredGroups.length}
                </Badge>
              )}
            </Group>
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={() => setShowGroupSelector(!showGroupSelector)}
            >
              {showGroupSelector ? (
                <IconChevronUp size={14} />
              ) : (
                <IconChevronDown size={14} />
              )}
            </ActionIcon>
          </Group>

          {showGroupSelector && (
            <Box
              style={{
                padding: 8,
                background: '#fffbeb',
                borderRadius: 6,
                border: '1px solid #fde68a',
              }}
            >
              <Group justify="space-between" mb="xs">
                <Checkbox
                  size="xs"
                  checked={filter.allGroupsSelected}
                  onChange={() =>
                    filter.allGroupsSelected ? filter.clearGroupFilter() : filter.selectAllGroups()
                  }
                  label={<Text size="11px">全选</Text>}
                />
                {filter.filter.selectedGroups.length > 0 && (
                  <Tooltip label="清除">
                    <ActionIcon size="xs" variant="light" color="gray" onClick={filter.clearGroupFilter}>
                      <IconX size={12} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
              <ScrollArea h={100} type="hover">
                <Stack gap="xs">
                  {filter.filteredGroups.map((group) => (
                    <Checkbox
                      key={group.groupKey}
                      size="xs"
                      checked={filter.filter.selectedGroups.includes(group.groupKey)}
                      onChange={() => filter.toggleGroupInFilter(group.groupKey)}
                      label={
                        <Text size="11px">
                          {group.groupName} ({group.count}块)
                        </Text>
                      }
                    />
                  ))}
                </Stack>
              </ScrollArea>
            </Box>
          )}

          <Group justify="space-between">
            <Group gap="xs">
              <IconListCheck size={14} color="#10b981" />
              <Text size="xs" fw={500}>
                施工步骤筛选
              </Text>
              {filter.filter.selectedSteps.length > 0 && (
                <Badge size="xs" variant="light" color="teal">
                  {filter.filter.selectedSteps.length}/{filter.filteredSteps.length}
                </Badge>
              )}
            </Group>
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={() => setShowStepSelector(!showStepSelector)}
            >
              {showStepSelector ? (
                <IconChevronUp size={14} />
              ) : (
                <IconChevronDown size={14} />
              )}
            </ActionIcon>
          </Group>

          {showStepSelector && (
            <Box
              style={{
                padding: 8,
                background: '#ecfdf5',
                borderRadius: 6,
                border: '1px solid #6ee7b7',
              }}
            >
              <Group justify="space-between" mb="xs">
                <Checkbox
                  size="xs"
                  checked={filter.allStepsSelected}
                  onChange={() =>
                    filter.allStepsSelected ? filter.clearStepFilter() : filter.selectAllSteps()
                  }
                  label={<Text size="11px">全选</Text>}
                />
                {filter.filter.selectedSteps.length > 0 && (
                  <Tooltip label="清除">
                    <ActionIcon size="xs" variant="light" color="gray" onClick={filter.clearStepFilter}>
                      <IconX size={12} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
              <ScrollArea h={100} type="hover">
                <Stack gap="xs">
                  {filter.filteredSteps.map((step) => (
                    <Checkbox
                      key={step.stepNumber}
                      size="xs"
                      checked={filter.filter.selectedSteps.includes(step.stepNumber)}
                      onChange={() => filter.toggleStepInFilter(step.stepNumber)}
                      label={
                        <Text size="11px">
                          第{step.stepNumber}步 ({step.tileIds.length}块)
                        </Text>
                      }
                    />
                  ))}
                </Stack>
              </ScrollArea>
            </Box>
          )}
        </Stack>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">筛选结果</Text>
            {filter.hasActiveFilter && (
              <Badge size="xs" variant="light" color="blue">
                已筛选
              </Badge>
            )}
          </Group>
          <Group grow>
            <div>
              <Text size="10px" c="dimmed">瓦片数</Text>
              <Text fw={700} size="md">
                {filter.filteredTotalCount}
              </Text>
            </div>
            <div>
              <Text size="10px" c="dimmed">材料组数</Text>
              <Text fw={700} size="md">
                {filter.filteredGroups.length}
              </Text>
            </div>
            <div>
              <Text size="10px" c="dimmed">施工步数</Text>
              <Text fw={700} size="md">
                {filter.filteredSteps.length}
              </Text>
            </div>
          </Group>
          <Group justify="space-between">
            <Text size="10px" c="dimmed">总面积</Text>
            <Text size="sm" fw={600}>
              {(filter.filteredTotalArea / 1000000).toFixed(4)} m²
            </Text>
          </Group>
          <Group justify="space-between">
            <Text size="10px" c="dimmed">占总数比</Text>
            <Text size="sm" fw={600}>
              {filter.filteredPercentage.toFixed(1)}%
            </Text>
          </Group>
        </Stack>
      </Card.Section>

      <Card.Section p="md">
        <Stack gap="sm">
          <Group grow>
            <Button
              size="sm"
              leftSection={<IconPrinter size={14} />}
              variant="filled"
              color="blue"
              onClick={() =>
                filter.hasActiveFilter
                  ? printFilteredConstructionList()
                  : printConstructionList()
              }
            >
              {filter.hasActiveFilter ? '打印筛选清单' : '打印完整清单'}
            </Button>
            <Button
              size="sm"
              leftSection={<IconFileExport size={14} />}
              variant="light"
              color="blue"
              onClick={() => setShowPreview(true)}
            >
              预览明细
            </Button>
          </Group>
          {filter.hasActiveFilter && (
            <Button
              size="sm"
              variant="subtle"
              color="gray"
              leftSection={<IconRefresh size={14} />}
              onClick={filter.resetFilter}
            >
              重置筛选条件
            </Button>
          )}
        </Stack>
      </Card.Section>

      <Modal
        opened={showPreview}
        onClose={() => setShowPreview(false)}
        title={`施工清单预览（${filter.filteredTiles.length} 块）`}
        size="lg"
      >
        <Stack gap="md">
          <Group justify="space-between">
            <Badge variant="light" color="blue">
              共 {filter.filteredTiles.length} 块瓦片
            </Badge>
            <Button
              size="xs"
              leftSection={<IconPrinter size={14} />}
              onClick={() => {
                setShowPreview(false);
                setTimeout(
                  () =>
                    filter.hasActiveFilter
                      ? printFilteredConstructionList()
                      : printConstructionList(),
                  100
                );
              }}
            >
              打印
            </Button>
          </Group>

          <Divider />

          <Text size="sm" fw={500}>瓦片明细</Text>
          <ScrollArea h={300} type="hover">
            <Stack gap="xs">
              {filter.filteredTiles.map((tile) => {
                const num = numberingResult.numberingMap[tile.id];
                const isFocused = focusedTileId === tile.id;
                return (
                  <Group
                    key={tile.id}
                    justify="space-between"
                    style={{
                      padding: '6px 10px',
                      background: isFocused ? '#dbeafe' : '#f8fafc',
                      borderRadius: 6,
                      cursor: 'pointer',
                      border: `1px solid ${isFocused ? '#3b82f6' : '#e2e8f0'}`,
                    }}
                    onClick={() => handleTileClick(tile)}
                  >
                    <Group gap="xs">
                      <Badge size="sm" variant="light" color={tile.isCut ? 'orange' : 'green'}>
                        {tile.isCut ? '裁切' : '完整'}
                      </Badge>
                      <Text size="sm" fw={600} c="blue">
                        {num?.displayNumber || tile.id}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="11px" c="dimmed">
                        R{tile.row + 1} C{tile.col + 1}
                      </Text>
                      <Text size="11px" c="dimmed">
                        {tile.width.toFixed(0)}×{tile.height.toFixed(0)}mm
                      </Text>
                    </Group>
                  </Group>
                );
              })}
              {filter.filteredTiles.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  没有匹配的瓦片
                </Text>
              )}
            </Stack>
          </ScrollArea>

          <Text size="xs" c="dimmed" ta="center">
            点击瓦片可在画布上定位高亮
          </Text>
        </Stack>
      </Modal>
    </Card>
  );
}

void IconListNumbers;
