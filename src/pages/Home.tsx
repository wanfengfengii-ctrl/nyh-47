import { AppShell, Group, Title, Text, Stack, ScrollArea } from '@mantine/core';
import { IconBuildingChurch } from '@tabler/icons-react';
import RoofControlPanel from '@/components/RoofControlPanel';
import TileControlPanel from '@/components/TileControlPanel';
import StatsPanel from '@/components/StatsPanel';
import RoofCanvas from '@/components/RoofCanvas';
import TileDetailPanel from '@/components/TileDetailPanel';
import LegendPanel from '@/components/LegendPanel';
import ExportImportToolbar from '@/components/ExportImportToolbar';

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
                古建筑瓦作屋面排布计算器
              </Title>
              <Text size="xs" c="dimmed">
                模拟屋面瓦片排布 · 估算材料损耗
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

          <Stack gap="md" style={{ width: 280, flexShrink: 0 }}>
            <TileDetailPanel />
            <LegendPanel />
          </Stack>
        </Group>
      </AppShell.Main>
    </AppShell>
  );
}