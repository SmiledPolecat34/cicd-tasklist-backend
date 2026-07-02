pipeline {
    agent any

    environment {
        IMAGE_NAME   = "smiledharr2/tasklist-backend"
        IMAGE_TAG    = "${env.BUILD_NUMBER}"
        SONAR_SERVER = "sonarqube-server"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Prisma generate') {
            steps {
                sh 'npx prisma generate'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Unit tests') {
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit 'reports/junit.xml'
                    archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
                }
            }
        }

        stage('E2E tests') {
            steps {
                sh 'npm run test:e2e:coverage'
            }
            post {
                always {
                    junit 'reports/junit.xml'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
                    withSonarQubeEnv("${SONAR_SERVER}") {
                        sh 'npx sonar-scanner -Dsonar.login=$SONAR_TOKEN'
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker build') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('Trivy scan') {
            steps {
                sh """
                    trivy image --exit-code 0 --severity HIGH,CRITICAL \
                    --format table -o trivy-report-backend.txt ${IMAGE_NAME}:${IMAGE_TAG}
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report-backend.txt', allowEmptyArchive: true
                }
            }
        }

        stage('SBOM SPDX') {
            steps {
                sh "syft ${IMAGE_NAME}:${IMAGE_TAG} -o spdx-json=sbom-spdx.json"
            }
            post {
                always {
                    archiveArtifacts artifacts: 'sbom-spdx.json', allowEmptyArchive: true
                }
            }
        }

        stage('Docker push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                    sh "docker push ${IMAGE_NAME}:${IMAGE_TAG}"
                    sh "docker push ${IMAGE_NAME}:latest"
                    sh 'docker logout'
                }
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f || true'
        }
    }
}
