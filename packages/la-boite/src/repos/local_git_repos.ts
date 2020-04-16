import path from 'path'
import { GitRepos, ConnectRepoRequest } from './git_repos'
import { GitRepo } from './git_repo'
import { LocalGitRepo } from './local_git_repo'
import { GitProcess } from 'dugite'
import Queue = require('bull')

enum RepoStatus {
  cloning,
  failed,
  ready,
}

export class LocalGitRepos implements GitRepos {
  basePath: string
  q: Queue.Queue<any>
  repoStatus: Map<string, RepoStatus> = new Map()
  repoJobId: Map<string, Queue.JobId> = new Map()

  constructor(basePath: string) {
    this.basePath = basePath
    const git = async (...args: string[]) => {
      const result = await GitProcess.exec(args, this.basePath)
      if (result.exitCode > 0) throw new Error(result.stderr)
    }
    this.q = new Queue('clone')
    this.q.process(async job => {
      const { repoId, remoteUrl } = job.data
      this.repoStatus.set(repoId, RepoStatus.cloning)
      this.repoJobId.set(repoId, job.id)
      await git('clone', remoteUrl, repoId)
      this.repoStatus.set(repoId, RepoStatus.ready)
    })
  }

  async close() {
    await this.q.close()
  }

  async waitUntilRepoCloned(repoId: string): Promise<void> {
    if (this.repoStatus.get(repoId) === RepoStatus.ready) return Promise.resolve()
    if (this.repoStatus.get(repoId) === RepoStatus.failed) return Promise.reject()
    const jobId = this.repoJobId.get(repoId)
    return new Promise((resolve, reject) =>
      this.q
        .on('failed', (job, err) => job.id === jobId && reject(err))
        .on('completed', job => {
          job.id === jobId && resolve()
        }),
    )
  }

  async connectToRemote(request: ConnectRepoRequest): Promise<void> {
    const { repoId, remoteUrl } = request
    const job = await this.q.add({ remoteUrl, repoId })
    this.repoStatus.set(repoId, RepoStatus.cloning)
    this.repoJobId.set(repoId, job.id)
  }

  findRepo(repoId: string): GitRepo {
    const repoPath = path.resolve(this.basePath, repoId)
    return new LocalGitRepo(repoId, repoPath)
  }
}
