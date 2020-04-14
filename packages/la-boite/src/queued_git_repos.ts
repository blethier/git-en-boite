import { GitRepos, ConnectRepoRequest } from './repos/git_repos'
import { Queue, Worker, QueueEvents } from 'bullmq'

export default class QueuedGitRepos implements GitRepos {
  localGitRepos: GitRepos
  private queue: Queue
  private worker: Worker
  private repos: any

  constructor(localGitRepos: GitRepos) {
    this.localGitRepos = localGitRepos
    this.queue = new Queue('Git clone jobs')
    this.worker = new Worker('Git clone jobs', async job => {
      console.log('processing...', job.id)
      await this.localGitRepos.connectToRemote(job.data)
      console.log('done.', job.id)
    })
    this.repos = {}
  }

  async connectToRemote(request: ConnectRepoRequest) {
    // await this.worker.waitUntilReady()
    await this.queue.waitUntilReady()
    const job = await this.queue.add('ConnectRepoRequest', request)
    this.repos[job.id] = request.repoId
  }

  onRepoReady(repoId, handler) {
    const handleDone = job => {
      console.log('done', job.id)
      if (this.repos[job.id] === repoId) handler({ repoId })
    }
    this.worker.on('completed', handleDone)
    this.worker.on('failed', handleDone)
  }

  findRepo(repoId: string) {
    return this.localGitRepos.findRepo(repoId)
  }

  async close() {
    await this.worker.close()
    await this.queue.close()
  }
}
