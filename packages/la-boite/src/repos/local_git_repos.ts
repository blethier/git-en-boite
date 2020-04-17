import path from 'path'
import { GitRepos, ConnectRepoRequest } from './git_repos'
import { GitRepo } from './git_repo'
import { LocalGitRepo } from './local_git_repo'
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
  jobRepoId: Map<Queue.JobId, string> = new Map()

  constructor(basePath: string) {
    this.basePath = basePath
    this.q = new Queue('clone')
    this.q.process(__dirname + '/jobs/clone.js')
    this.q.on('active', job => this.repoStatus.set(this.jobRepoId.get(job.id), RepoStatus.cloning))
    this.q.on('failed', job => this.repoStatus.set(this.jobRepoId.get(job.id), RepoStatus.failed))
    this.q.on('completed', job => this.repoStatus.set(this.jobRepoId.get(job.id), RepoStatus.ready))
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
    const job = await this.q.add({ remoteUrl, repoId, basePath: this.basePath })
    this.repoStatus.set(repoId, RepoStatus.cloning)
    this.repoJobId.set(repoId, job.id)
    this.jobRepoId.set(job.id, repoId)
  }

  findRepo(repoId: string): GitRepo {
    const repoPath = path.resolve(this.basePath, repoId)
    return new LocalGitRepo(repoId, repoPath)
  }
}
