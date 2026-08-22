import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

const execFile = promisify(execFileCallback);
const integrationEnabled = process.env.RUN_SUPABASE_SUGGESTED_PLACE_INTEGRATION === '1';

async function localSql(sql) {
  const container = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_tomoni-app';
  const { stdout } = await execFile('docker', [
    'exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-At',
    '-v', 'ON_ERROR_STOP=1', '-c', sql,
  ]);
  return stdout.trim().split(/\r?\n/u).find((line) => line.startsWith('{'));
}

test('local PostGIS recommendation applies worst, total, and UUID ordering deterministically', {
  skip: !integrationEnabled,
}, async () => {
  const resultText = await localSql(`
    begin;

    with scenario_points(label, point) as (
      values
        ('worst_sender', extensions.st_setsrid(extensions.st_makepoint(0, 0), 4326)::extensions.geography),
        ('worst_receiver', extensions.st_project(extensions.st_setsrid(extensions.st_makepoint(0, 0), 4326)::extensions.geography, 2000, radians(90))),
        ('worst_balanced', extensions.st_project(extensions.st_setsrid(extensions.st_makepoint(0, 0), 4326)::extensions.geography, 1000, radians(90))),
        ('total_sender', extensions.st_setsrid(extensions.st_makepoint(10, 10), 4326)::extensions.geography),
        ('total_receiver', extensions.st_project(extensions.st_setsrid(extensions.st_makepoint(10, 10), 4326)::extensions.geography, 2000, radians(90))),
        ('total_longer', extensions.st_project(extensions.st_setsrid(extensions.st_makepoint(10, 10), 4326)::extensions.geography, 2000, radians(60))),
        ('tie_sender', extensions.st_setsrid(extensions.st_makepoint(20, 20), 4326)::extensions.geography),
        ('tie_receiver', extensions.st_project(extensions.st_setsrid(extensions.st_makepoint(20, 20), 4326)::extensions.geography, 2000, radians(90)))
    ),
    candidates(public_place_id, source_place_id, name, point) as (
      select 'ff000000-0000-4000-8000-000000000001'::uuid, 'worst-unfair', 'worst unfair', point
      from scenario_points where label = 'worst_sender'
      union all
      select 'ff000000-0000-4000-8000-000000000002'::uuid, 'worst-balanced', 'worst balanced', point
      from scenario_points where label = 'worst_balanced'
      union all
      select 'ee000000-0000-4000-8000-000000000001'::uuid, 'total-shorter', 'total shorter', point
      from scenario_points where label = 'total_sender'
      union all
      select '11000000-0000-4000-8000-000000000001'::uuid, 'total-longer', 'total longer', point
      from scenario_points where label = 'total_longer'
      union all
      select '22000000-0000-4000-8000-000000000002'::uuid, 'tie-high', 'tie high uuid', point
      from scenario_points where label = 'tie_sender'
      union all
      select '11000000-0000-4000-8000-000000000002'::uuid, 'tie-low', 'tie low uuid', point
      from scenario_points where label = 'tie_receiver'
    )
    insert into public.public_places (
      public_place_id, source_dataset_id, source_place_id, source_name,
      name, category, latitude, longitude, attributes, last_checked_at
    )
    select
      candidate.public_place_id,
      'integration_suggested_place',
      candidate.source_place_id,
      'integration test',
      candidate.name,
      'park',
      extensions.st_y(candidate.point::extensions.geometry),
      extensions.st_x(candidate.point::extensions.geometry),
      '{"walking_place":{"large_park_candidate":true,"area_square_meters":20000}}'::jsonb,
      now()
    from candidates candidate;

    select json_build_object(
      'worst', (
        select recommendation.name
        from public.recommend_walking_public_place(
          0,
          0,
          extensions.st_y(extensions.st_project(extensions.st_setsrid(extensions.st_makepoint(0, 0), 4326)::extensions.geography, 2000, radians(90))::extensions.geometry),
          extensions.st_x(extensions.st_project(extensions.st_setsrid(extensions.st_makepoint(0, 0), 4326)::extensions.geography, 2000, radians(90))::extensions.geometry)
        ) recommendation
      ),
      'total', (
        select recommendation.name
        from public.recommend_walking_public_place(
          10,
          10,
          extensions.st_y(extensions.st_project(extensions.st_setsrid(extensions.st_makepoint(10, 10), 4326)::extensions.geography, 2000, radians(90))::extensions.geometry),
          extensions.st_x(extensions.st_project(extensions.st_setsrid(extensions.st_makepoint(10, 10), 4326)::extensions.geography, 2000, radians(90))::extensions.geometry)
        ) recommendation
      ),
      'tie', (
        select recommendation.name
        from public.recommend_walking_public_place(
          20,
          20,
          extensions.st_y(extensions.st_project(extensions.st_setsrid(extensions.st_makepoint(20, 20), 4326)::extensions.geography, 2000, radians(90))::extensions.geometry),
          extensions.st_x(extensions.st_project(extensions.st_setsrid(extensions.st_makepoint(20, 20), 4326)::extensions.geography, 2000, radians(90))::extensions.geometry)
        ) recommendation
      )
    );

    rollback;
  `);

  assert.ok(resultText);
  const result = JSON.parse(resultText);
  assert.equal(result.worst, 'worst balanced');
  assert.equal(result.total, 'total shorter');
  assert.equal(result.tie, 'tie low uuid');
});
