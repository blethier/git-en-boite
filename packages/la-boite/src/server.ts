/* tslint:disable: no-console */
import 'reflect-metadata'

import { createConnection } from 'typeorm'
import { createConfig } from './config'
import WebApp from './web_app'
import Router from './router'
import { LocalGitRepos } from './repos/local_git_repos'
import { Application } from './application'
import QueuedGitRepos from './queued_git_repos'

const config = createConfig(process.env)
console.log(`git-en-boite starting up`)
console.log(`Using config: ${JSON.stringify(config, null, 2)}`)

// check we can make a connection
const connection = createConnection(config.database).catch(error => console.log(error))

const localGitRepos = new LocalGitRepos(config.git.root)
const repos = new QueuedGitRepos(localGitRepos)
const app = { repos } as Application

const routes = Router.create(app)
const webApp = WebApp.withRoutes(routes)
const port = 3001
const host = 'localhost'
webApp.listen(port)
console.log(`Server listening on http://${host}:${port}`)
