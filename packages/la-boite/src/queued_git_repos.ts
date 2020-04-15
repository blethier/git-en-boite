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

  waitUntilReady(repoId: string) {
    const ifJobIsForRepo = (fn: { (): any }) => (job: any) => this.repos[job.id] === repoId && fn()
    return new Promise((resolve, reject) => {
      this.worker.on('completed', ifJobIsForRepo(resolve))
      this.worker.on('failed', ifJobIsForRepo(reject))
    })
  }

  findRepo(repoId: string) {
    return this.localGitRepos.findRepo(repoId)
  }

  async close() {
    await this.worker.waitUntilReady()
    await this.queue.waitUntilReady()
    await this.worker.close()
    await this.queue.close()
    console.log('closed everything!')
  }
}
