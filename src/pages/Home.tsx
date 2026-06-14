import { AppShell, Group, Title, Text, Stack, ScrollArea, Tabs } from '@mantine/core';
import { IconBuildingChurch, IconListNumbers, IconListCheck, IconPackages } from '@tabler/icons-react';
import RoofControlPanel from '@/components/RoofControlPanel';
import TileControlPanel from '@/components/TileControlPanel';
import StatsPanel from '@/components/StatsPanel';
import RoofCanvas from '@/components/RoofCanvas';
import TileDetailPanel from '@/components/TileDetailPanel';
import LegendPanel from '@/components/LegendPanel';
import ExportImportToolbar from '@/components/ExportImportToolbar';
import TileNumberingPanel from '@/components/TileNumberingPanel';
import ConstructionSequencePanel from '@/components/ConstructionSequencePanel';
import MaterialStatsPanel from '@/components/MaterialStatsPanel';

export default function Home() {
  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
      style={{ height: '100vh' }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <IconBuildingChurch size={28} color="#8b4513" />
            <div>
              <Title order={4} c="dark">
                古建筑屋面瓦片智能编号与施工清单系统
              </Title>
              <Text size="xs" c="dimmed">
                瓦片排布 · 智能编号 · 施工顺序 · 材料统计 · 清单导出
              </Text>
            </div>
          </Group>
          <ExportImportToolbar />
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Group align="flex-start" style={{ height: '100%' }} wrap="nowrap">
          <Stack gap="md" style={{ width: 320, flexShrink: 0 }}>
            <ScrollArea type="hover" style={{ height: 'calc(100vh - 90px)' }}>
              <Stack gap="md" pr="xs">
                <RoofControlPanel />
                <TileControlPanel />
                <StatsPanel />
              </Stack>
            </ScrollArea>
          </Stack>

          <div style={{ flex: 1, height: 'calc(100vh - 90px)' }}>
            <RoofCanvas />
          </div>

          <Stack gap="md" style={{ width: 320, flexShrink: 0 }}>
            <ScrollArea type="hover" style={{ height: 'calc(100vh - 90px)' }}>
              <Stack gap="md" pr="xs">
                <TileDetailPanel />
                <Tabs defaultValue="numbering" variant="outline">
                  <Tabs.List grow>
                    <Tabs.Tab value="numbering" leftSection={<IconListNumbers size={14} />}>
                      编号
                    </Tabs.Tab>
                    <Tabs.Tab value="sequence" leftSection={<IconListCheck size={14} />}>
                      施工
                    </Tabs.Tab>
                    <Tabs.Tab value="materials" leftSection={<IconPackages size={14} />}>
                      材料
                    </Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="numbering" pt="md">
                    <TileNumberingPanel />
                  </Tabs.Panel>

                  <Tabs.Panel value="sequence" pt="md">
                    <ConstructionSequencePanel />
                  </Tabs.Panel>

                  <Tabs.Panel value="materials" pt="md">
                    <MaterialStatsPanel />
                  </Tabs.Panel>
                </Tabs>
                <LegendPanel />
              </Stack>
            </ScrollArea>
          </Stack>
        </Group>
      </AppShell.Main>
    </AppShell>
  );
}