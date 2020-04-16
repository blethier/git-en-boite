const { GitProcess } = require('dugite')

module.exports = job => {
  const { basePath, repoId, remoteUrl } = job.data
  const git = async (...args) => {
    const result = await GitProcess.exec(args, basePath)
    if (result.exitCode > 0) throw new Error(result.stderr)
  }
  return git('clone', remoteUrl, repoId)
}
