properties([
  pipelineTriggers([
    githubPush()
  ])
])

pipeline {
  agent any

  options {
    skipDefaultCheckout()
  }

  environment {
    // Project directories
    WORKSPACE_DIR = "${env.WORKSPACE}"
    FE_DIR = "${env.WORKSPACE}"
    BE_DIR = "${env.WORKSPACE}/backend"

    // Frontend Config
    IMAGE_NAME_FE = 'commodity-visualizer-fe'
    CONTAINER_NAME_FE = 'commodity-visualizer-fe'
    PORT_FE = '3100'
    ENV_FILE_FE = '/opt/env/commodity-visualizer-fe.env'

    // Backend Config
    IMAGE_NAME_BE = 'commodity-visualizer-be'
    CONTAINER_NAME_BE = 'commodity-visualizer-be'
    PORT_BE = '8100'
    ENV_FILE_BE = '/opt/env/commodity-visualizer-be.env'

    // General Config
    SLACK_CHANNEL = '#deployments'
  }

  stages {
    stage('Init') {
      steps {
        script {
          env.DATETIME = sh(script: "TZ='Asia/Ho_Chi_Minh' date +%Y%m%d-%H%M%S", returnStdout: true).trim()
          env.HUMAN_DATETIME = sh(script: "TZ='Asia/Ho_Chi_Minh' date +'%d/%m/%Y %H:%M'", returnStdout: true).trim()
        }
      }
    }

    stage('Clone Source Code') {
      steps {
        // Assuming the Jenkins job is already configured to checkout the repo or we use steps here
        // If "skipDefaultCheckout()" is on, we need to clone manually.
        // Using the passed credentials if available, modifying from original file.
        // NOTE: Adusting path to match user's structure if needed, but standard checkout usually easiest.
        // For this file, I'll stick to the user's pattern of manual clone if that's what they want,
        // but typically 'checkout scm' is better.
        // I will use 'checkout scm' pattern or the manual one provided in the original file.
        // Original file used a manual clone into specific dir. I will assume we want to checkout into current workspace.

        checkout scm
      }
    }

    stage('Build & Deploy Services') {
      parallel {
        stage('Frontend') {
          stages {
            stage('Build FE Image') {
              steps {
                sh """
                  echo "Building Frontend Docker image..."

                  # Load env if exists for build args
                  if [ -f "\$ENV_FILE_FE" ]; then
                    set -a; . "\$ENV_FILE_FE"; set +a
                  fi

                  docker build \\
                    --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="\${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}" \\
                    --build-arg CLERK_SECRET_KEY="\${CLERK_SECRET_KEY}" \\
                    --build-arg NEXT_PUBLIC_BASE_URL="\${NEXT_PUBLIC_BASE_URL}" \\
                    --build-arg NEXT_PUBLIC_CHATBOT_API_URL="\${NEXT_PUBLIC_CHATBOT_API_URL}" \\
                    --build-arg NEXT_PUBLIC_NOTIFICATION_BASE_URL="\${NEXT_PUBLIC_NOTIFICATION_BASE_URL}" \\
                    --build-arg NODE_ENV="\${NODE_ENV}" \\
                    -t $IMAGE_NAME_FE:$DATETIME \\
                    -t $IMAGE_NAME_FE:latest \\
                    "$FE_DIR"
                """
              }
            }

            stage('Deploy FE Container') {
              steps {
                sh """
                  echo "Deploying Frontend Container..."
                  docker stop "$CONTAINER_NAME_FE" || true
                  docker rm "$CONTAINER_NAME_FE" || true

                  # Load env vars for run command
                  ENV_OPTS=""
                  if [ -f "\$ENV_FILE_FE" ]; then
                     ENV_OPTS="--env-file \$ENV_FILE_FE"
                  fi

                  docker run -d \\
                    --name "$CONTAINER_NAME_FE" \\
                    -p $PORT_FE:3000 \\
                    \$ENV_OPTS \\
                    --restart unless-stopped \\
                    "$IMAGE_NAME_FE:$DATETIME"
                """
              }
            }
          }
        }

        stage('Backend') {
          stages {
            stage('Build BE Image') {
              steps {
                sh """
                  echo "Building Backend Docker image..."
                  docker build \\
                    -t $IMAGE_NAME_BE:$DATETIME \\
                    -t $IMAGE_NAME_BE:latest \\
                    "$BE_DIR"
                """
              }
            }

            stage('Deploy BE Container') {
              steps {
                sh """
                  echo "Deploying Backend Container..."
                  docker stop "$CONTAINER_NAME_BE" || true
                  docker rm "$CONTAINER_NAME_BE" || true

                  ENV_OPTS=""
                  if [ -f "\$ENV_FILE_BE" ]; then
                     ENV_OPTS="--env-file \$ENV_FILE_BE"
                  fi

                  docker run -d \\
                    --name "$CONTAINER_NAME_BE" \\
                    -p $PORT_BE:8000 \\
                    \$ENV_OPTS \\
                    --restart unless-stopped \\
                    "$IMAGE_NAME_BE:$DATETIME"
                """
              }
            }
          }
        }
      }
    }
  }

  post {
    success {
      slackSend(
        channel: SLACK_CHANNEL,
        color: 'good',
        tokenCredentialId: 'slack-token',
        message: """:rocket: *[Commodity Visualizer]* Deployment *Succeeded!*
━━━━━━━━━━━━━━━━━━━━━━━
• ✅ *Status:* SUCCESS
• 🌐 *Frontend:* <https://cv.ndtduy.live> (Port $PORT_FE)
• ⚙️ *Backend:* Port $PORT_BE
• 🕘 *Time:* _${env.HUMAN_DATETIME}_
• 🔗 *Build:* <${env.BUILD_URL}|View on Jenkins>
━━━━━━━━━━━━━━━━━━━━━━━"""
      )
    }

    failure {
      slackSend(
        channel: SLACK_CHANNEL,
        color: 'danger',
        tokenCredentialId: 'slack-token',
        message: """:fire: *[Commodity Visualizer]* Deployment *Failed!*
━━━━━━━━━━━━━━━━━━━━━━━
• ❌ *Status:* FAILED
• 🕘 *Time:* _${env.HUMAN_DATETIME}_
• 🔗 *Build:* <${env.BUILD_URL}|View on Jenkins>
━━━━━━━━━━━━━━━━━━━━━━━"""
      )
    }
  }
}
