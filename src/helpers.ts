import * as exec from '@actions/exec';
import * as core from '@actions/core';
import {ExecOptions, ExecOutput} from '@actions/exec';

export async function getExecOutput(commandLine: string, args?: string[], options?: ExecOptions): Promise<ExecOutput> {
  core.debug(`Exec.getExecOutput: ${commandLine} ${args?.join(' ')}`);
  return exec.getExecOutput(commandLine, args, options);
}

export async function isBentomlAvailable(): Promise<boolean> {
  const ok: boolean = await getExecOutput('bentoml', ['--version'], {
    ignoreReturnCode: true,
    silent: true
  })
    .then(res => {
      if (res.stderr.length > 0 && res.exitCode != 0) {
        core.debug(`isBentomlAvailable cmd err: ${res.stderr.trim()}`);
        return false;
      }
      return res.exitCode == 0;
    })
    .catch(error => {
      core.debug(`isBentomlAvailable error: ${error}`);
      return false;
    });
  core.debug(`isBentomlAvailable: ${ok}`);
  return ok;
}
