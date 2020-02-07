const path = require('path')
const Git = require('nodegit')

module.exports = class Repo {
  constructor() {
    const repoName = 'repository'
    this._openRepository = () => Git.Repository.open(path.resolve(__dirname, repoName))
  }

  async getBranches() {
    const repository = await this._openRepository()
    const stdVectorGitReference = await repository.getReferences()
    const branches = []
    
    stdVectorGitReference.forEach((reference) => {
      if (reference.isBranch() && !reference.isRemote()) {
        branches.push(reference.name())
      }
    })

    return branches
  }

  async getFiles(branchName = 'master') {
    const repository = await this._openRepository()
    const commit = await repository.getReferenceCommit(branchName)
    const tree = await commit.getTree()
    return walkTree(tree)
  }

  async pullFromOrigin() {
    const repository = await this._openRepository()
    await repository.fetchAll()
    await repository.mergeBranches("master", "origin/master")
  }
}

const walkTree = (tree) => {
  const treeWalker = tree.walk()
  const files = []

  return new Promise(resolve => {
    treeWalker.on('entry', function (entry) {
      files.push(entry.path())
    })
    treeWalker.on('end', function () {
      resolve(files)
    })

    treeWalker.start()
  })
}
