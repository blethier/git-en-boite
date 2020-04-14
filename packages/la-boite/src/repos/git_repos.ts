import { GitRepo } from './git_repo'

export interface ConnectRepoRequest {
  repoId: string
  remoteUrl: string
}

export interface GitRepos {
  connectToRemote: (request: ConnectRepoRequest) => Promise<any>
  findRepo: (repoId: string) => GitRepo
}
