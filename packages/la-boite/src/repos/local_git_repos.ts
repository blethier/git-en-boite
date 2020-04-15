import path from 'path'
import { GitRepos, ConnectRepoRequest } from './git_repos'
import { GitRepo } from './git_repo'
import { LocalGitRepo } from './local_git_repo'
import { GitProcess } from 'dugite'
import Queue = require('bull')

export class LocalGitRepos implements GitRepos {
  basePath: string
  q: Queue.Queue<any>

  constructor(basePath: string) {
    this.basePath = basePath
    const git = async (...args: string[]) => {
      const result = await GitProcess.exec(args, this.basePath)
      if (result.exitCode > 0) throw new Error(result.stderr)
    }
    this.q = new Queue('clone')
    this.q.process(async job => {
      const { repoId, remoteUrl } = job.data
      console.log('cloning...')
      await git('clone', remoteUrl, repoId)
      console.log('done')
    })
  }

  async close() {
    await this.q.close()
  }

  async connectToRemote(request: ConnectRepoRequest): Promise<void> {
    const { repoId, remoteUrl } = request
    this.q.add({ remoteUrl, repoId })
    return new Promise((resolve, reject) =>
      this.q.on('failed', (job, err) => reject(err)).on('completed', (job, result) => resolve()),
    )
  }

  findRepo(repoId: string): GitRepo {
    const repoPath = path.resolve(this.basePath, repoId)
    return new LocalGitRepo(repoId, repoPath)
  }
}
