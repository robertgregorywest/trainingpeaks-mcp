import { describe, it, expect, beforeEach } from 'vitest';
import { createMcpServer } from '../src/mcp/server.js';
import { createMockClient, mockUser, type MockClient } from './mocks/client.js';
import type { TrainingPeaksClient } from '../src/index.js';

describe('MCP Server', () => {
  let mockClient: MockClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe('createMcpServer', () => {
    it('should create server with correct name and version', () => {
      const server = createMcpServer(mockClient as unknown as TrainingPeaksClient);
      expect(server).toBeDefined();
    });

    it('should register all expected tools', async () => {
      const server = createMcpServer(mockClient as unknown as TrainingPeaksClient);

      const expectedTools = [
        'get_user',
        'get_athlete_id',
        'get_workouts',
        'get_workout',
        'get_workout_details',
        'search_workouts',
        'compare_intervals',
        'get_strength_workouts',
        'parse_fit_file',
        'clear_fit_cache',
        'get_fitness_data',
        'get_current_fitness',
        'get_peaks',
        'get_workout_peaks',
        'get_best_power',
        'get_power_duration_curve',
        'get_aerobic_decoupling',
        'get_current_date',
      ];

      // Access registered tools via the internal _registeredTools object
      const registeredTools = (server as unknown as { _registeredTools: Record<string, unknown> })
        ._registeredTools;
      const toolNames = Object.keys(registeredTools);

      expect(toolNames).toEqual(expect.arrayContaining(expectedTools));
      expect(toolNames).toHaveLength(expectedTools.length);
    });
  });

  describe('tool execution', () => {
    it('should execute get_user tool correctly', async () => {
      const result = await mockClient.getUser();
      expect(result).toEqual(mockUser);
    });
  });
});
