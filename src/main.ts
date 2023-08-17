import * as fs from 'fs';
import * as stateHelper from './state-helper';
import * as core from '@actions/core';
import * as actionsToolkit from '@docker/actions-toolkit';
import {Context} from '@docker/actions-toolkit/lib/context';
import {Docker} from '@docker/actions-toolkit/lib/docker/docker';
import {GitHub} from '@docker/actions-toolkit/lib/github';
import {Toolkit} from '@docker/actions-toolkit/lib/toolkit';
import * as Helpers from './helpers';
import * as context from './context';

actionsToolkit.run(
  // main
  async () => {
    const inputs: context.Inputs = await context.getInputs();
    const toolkit = new Toolkit();

    await core.group(`GitHub Actions runtime token ACs`, async () => {
      try {
        await GitHub.printActionsRuntimeTokenACs();
      } catch (e) {
        core.warning(e.message);
      }
    });

    await core.group(`Docker info`, async () => {
      try {
        await Docker.printVersion();
        await Docker.printInfo();
      } catch (e) {
        core.info(e.message);
      }
    });

    const dockerConfig = await Docker.configFile();
    if (dockerConfig && dockerConfig.proxies) {
      await core.group(`Proxy configuration found`, async () => {
        for (const host in dockerConfig.proxies) {
          let prefix = '';
          if (dockerConfig.proxies.length > 1) {
            prefix = '  ';
            core.info(host);
          }
          for (const key in dockerConfig.proxies[host]) {
            core.info(`${prefix}${key}: ${dockerConfig.proxies[host][key]}`);
          }
        }
      });
    }

    if (!(await toolkit.buildx.isAvailable())) {
      core.setFailed(`Docker buildx is required. See https://github.com/docker/setup-buildx-action to set up buildx.`);
      return;
    }

    if (!(await Helpers.isBentomlAvailable())) {
      core.setFailed(`BentoML is required. See https://github.com/bentoml/containerize-and-push-action for more information.`);
      return;
    }

    await core.group(`BentoML check`, async () => {
      try {
        await Helpers.getExecOutput('bentoml', ['list'], {silent: true}).then(res => {
          core.info(res.stdout.match(/(.*)\s*$/)?.[0]?.trim() ?? 'non available');
        });
        await Helpers.getExecOutput('bentoml', ['get', inputs.bentoTag], {
          ignoreReturnCode: true,
          silent: true
        }).then(res => {
          if (res.stderr.length > 0 && res.exitCode != 0) {
            throw new Error(`Failed to get available Bento ${inputs.bentoTag}: ${res.stderr.match(/(.*)\s*$/)?.[0]?.trim() ?? 'unknown error'}`);
          }
        });
      } catch (e) {
        core.info(e.message);
      }
    });

    stateHelper.setTmpDir(Context.tmpDir());

    await core.group(`Buildx version`, async () => {
      await toolkit.buildx.printVersion();
    });

    const args: string[] = await context.getArgs(inputs, toolkit);
    await core.group(`bentoml containerize`, async () => {
      try {
        await Helpers.getExecOutput('bentoml', args, {
          ignoreReturnCode: true
        }).then(res => {
          if (res.stderr.length > 0 && res.exitCode != 0) {
            throw new Error(`bentoml containerize failed with: ${res.stderr.match(/(.*)\s*$/)?.[0]?.trim() ?? 'unknown error'}`);
          }
        });
      } catch (e) {
        core.info(e.message);
      }
    });
  },
  // post
  async () => {
    if (stateHelper.tmpDir.length > 0) {
      await core.group(`Removing temp folder ${stateHelper.tmpDir}`, async () => {
        fs.rmSync(stateHelper.tmpDir, {recursive: true});
      });
    }
  }
);
