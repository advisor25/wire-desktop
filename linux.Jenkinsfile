@NonCPS
def parseJson(def text) {
  new groovy.json.JsonSlurperClassic().parseText(text)
}

node('node180') {

  checkout scm

  def jenkinsbot_secret = ''
  withCredentials([string(credentialsId: "${params.JENKINSBOT_SECRET}", variable: 'JENKINSBOT_SECRET')]) {
    jenkinsbot_secret = env.JENKINSBOT_SECRET
  }

  def text = readFile('info.json')
  def buildInfo = parseJson(text)
  def version = buildInfo.version + '.' + env.BUILD_NUMBER
  currentBuild.displayName = version;

  def environment = docker.build("node", "-f linux.Dockerfile .")

  environment.inside {

    stage('Checkout & Clean') {
      git branch: "${GIT_BRANCH}", url: 'https://github.com/wireapp/wire-desktop.git'
      sh returnStatus: true, script: 'rm -rf $WORKSPACE/wrap/ $WORKSPACE/electron/node_modules/ $WORKSPACE/node_modules/'
    }

    stage('Build') {
      try {
        sh 'pip install -r requirements.txt'
        sh 'node -v'
        sh 'npm -v'
        sh 'npm install'
        sh 'npm run build:ts'
        withCredentials([string(credentialsId: 'GOOGLE_CLIENT_ID', variable: 'GOOGLE_CLIENT_ID'), string(credentialsId: 'GOOGLE_CLIENT_SECRET', variable: 'GOOGLE_CLIENT_SECRET'), string(credentialsId: 'RAYGUN_API_KEY', variable: 'RAYGUN_API_KEY')]) {
          sh 'npx grunt linux-prod'
        }
      } catch(e) {
        currentBuild.result = 'FAILED'
        wireSend secret: "${jenkinsbot_secret}", message: "🐧 **${JOB_NAME} ${version} build failed** see: ${JOB_URL}"
        throw e
      }
    }

    stage('Generate repository') {
      withCredentials([file(credentialsId: 'D599C1AA126762B1.asc', variable: 'PGP_PRIVATE_KEY_FILE'), string(credentialsId: 'PGP_PASSPHRASE', variable: 'PGP_PASSPHRASE')]) {
        sh 'cd wrap/dist/ && ../../bin/repo/linux-prod-repo.sh'
      }
    }

    stage('Create SHA256 checksums') {
      withCredentials([file(credentialsId: 'D599C1AA126762B1.asc', variable: 'PGP_PRIVATE_KEY_FILE'), string(credentialsId: 'PGP_PASSPHRASE', variable: 'PGP_PASSPHRASE')]) {
        sh 'cd wrap/dist/ && ../../bin/linux-checksums.sh'
      }
    }

    stage('Test packaging') {
      sh 'dpkg-deb --info wrap/dist/debian/pool/main/*amd64.deb'
      sh 'dpkg-deb --info wrap/dist/debian/pool/main/*i386.deb'
    }

    stage('Save .deb, .rpm, AppImage and repo files') {
      archiveArtifacts 'info.json,wrap/dist/*.deb,wrap/dist/*.rpm,wrap/dist/*.AppImage,wrap/dist/debian/**'
    }

    stage('Upload build as draft to GitHub') {
      withCredentials([string(credentialsId: 'GITHUB_ACCESS_TOKEN', variable: 'GITHUB_ACCESS_TOKEN')]) {
        sh 'cd wrap/dist/ && python ../../bin/github_draft.py'
      }
    }
  }

  wireSend secret: "${jenkinsbot_secret}", message: "🐧 **New build of ${JOB_NAME} ${version} available for download on** ${JOB_URL}"
}
