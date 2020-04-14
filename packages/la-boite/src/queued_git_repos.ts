import { GitRepos, ConnectRepoRequest } from './repos/git_repos'
import { Queue, Worker, QueueEvents } from 'bullmq'

export default class QueuedGitRepos implements GitRepos {
  localGitRepos: GitRepos
  private queue: Queue
  private worker: Worker

  constructor(localGitRepos: GitRepos) {
    this.localGitRepos = localGitRepos
    this.queue = new Queue('Git clone jobs')
    this.worker = new Worker('Git clone jobs', async job => {
      console.log('processing...', job.id)
      await this.localGitRepos.connectToRemote(job.data)
      console.log('done.', job.id)
    })
  }

  async connectToRemote(request: ConnectRepoRequest) {
    const job = await this.queue.add('ConnectRepoRequest', request)
    const removeListeners = () => {
      this.worker.removeListener('failed', handleFailed)
      this.worker.removeListener('completed', handleCompleted)
    }
    const handleFailed = job => {
      console.log('failed: ', job.id)
      removeListeners()
    }
    this.worker.on('failed', handleFailed)

    const handleCompleted = job => {
      console.log('completed', job.id)
      removeListeners()
    }
    this.worker.on('completed', handleCompleted)
  }

  findRepo(repoId: string) {
    return this.localGitRepos.findRepo(repoId)
  }
}
