import path from 'path'
import { Before, After } from 'cucumber'
import { createConfig } from '../../../src/config'
import { LocalGitRepos } from '../../../src/repos/local_git_repos'
import childProcess from 'child_process'
import { promisify } from 'util'
import QueuedGitRepos from '../../../src/queued_git_repos'

const exec = promisify(childProcess.exec)

Before(async function () {
  this.tmpDir = path.resolve(__dirname, '../../tmp')
  await exec(`rm -rf ${this.tmpDir}`)
  await exec(`mkdir -p ${this.tmpDir}`)

  const gitReposPath = createConfig().git.root
  const localGitRepos = new LocalGitRepos(gitReposPath)
  await exec(`rm -rf ${gitReposPath}`)
  await exec(`mkdir -p ${gitReposPath}`)
  const repos = new QueuedGitRepos(localGitRepos)
  this.repos = repos
  this.app = { repos }
})

After(async function () {
  await this.repos.close()
  delete this.app
})
