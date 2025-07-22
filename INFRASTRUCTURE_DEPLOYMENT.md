# Infrastructure & Deployment Guide

## Overview
Complete infrastructure setup for deploying microservices and microfrontends with Kubernetes, monitoring, and CI/CD.

## 1. Kubernetes Infrastructure

### Namespace Setup: `kubernetes/namespaces.yaml`
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ai-assistant
  labels:
    name: ai-assistant
    istio-injection: enabled
---
apiVersion: v1
kind: Namespace
metadata:
  name: ai-assistant-monitoring
  labels:
    name: ai-assistant-monitoring
```

### ConfigMaps and Secrets: `kubernetes/config/configmap.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: ai-assistant
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  REDIS_HOST: "redis-service.ai-assistant.svc.cluster.local"
  RABBITMQ_HOST: "rabbitmq-service.ai-assistant.svc.cluster.local"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: ai-assistant
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@postgres-service:5432/aiassistant"
  OPENAI_API_KEY: "your-openai-key"
  ANTHROPIC_API_KEY: "your-anthropic-key"
  JWT_SECRET: "your-jwt-secret"
```

### Ingress Controller: `kubernetes/ingress/ingress.yaml`
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ai-assistant-ingress
  namespace: ai-assistant
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "*"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.aiassistant.com
    - app.aiassistant.com
    secretName: ai-assistant-tls
  rules:
  - host: api.aiassistant.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
  - host: app.aiassistant.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: shell-app
            port:
              number: 80
```

## 2. Service Mesh with Istio

### Istio Configuration: `kubernetes/istio/virtual-service.yaml`
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ai-assistant-vs
  namespace: ai-assistant
spec:
  hosts:
  - api.aiassistant.com
  gateways:
  - ai-assistant-gateway
  http:
  - match:
    - uri:
        prefix: /api/v1/chat
    route:
    - destination:
        host: chat-service
        port:
          number: 3001
      weight: 100
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
  - match:
    - uri:
        prefix: /api/v1/inference
    route:
    - destination:
        host: model-gateway
        port:
          number: 3002
      weight: 100
    timeout: 300s  # Longer timeout for AI inference
```

### Circuit Breaker: `kubernetes/istio/destination-rule.yaml`
```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: chat-service-dr
  namespace: ai-assistant
spec:
  host: chat-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
```

## 3. Monitoring Stack

### Prometheus Configuration: `kubernetes/monitoring/prometheus.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: ai-assistant-monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
    - job_name: 'kubernetes-services'
      kubernetes_sd_configs:
      - role: service
        namespaces:
          names:
          - ai-assistant
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - ai-assistant
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: ai-assistant-monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      serviceAccountName: prometheus
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        args:
          - '--config.file=/etc/prometheus/prometheus.yml'
          - '--storage.tsdb.path=/prometheus'
          - '--web.enable-lifecycle'
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: storage
          mountPath: /prometheus
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: storage
        persistentVolumeClaim:
          claimName: prometheus-pvc
```

### Grafana Dashboards: `kubernetes/monitoring/grafana-dashboard.json`
```json
{
  "dashboard": {
    "title": "AI Assistant Microservices",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (service)"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 }
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) by (service)"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 }
      },
      {
        "title": "Response Time (p99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 }
      },
      {
        "title": "Active WebSocket Connections",
        "targets": [
          {
            "expr": "websocket_active_connections"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 }
      }
    ]
  }
}
```

### ELK Stack: `kubernetes/logging/elasticsearch.yaml`
```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: ai-assistant-es
  namespace: ai-assistant-monitoring
spec:
  version: 8.11.0
  nodeSets:
  - name: default
    count: 3
    config:
      node.store.allow_mmap: false
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
        storageClassName: fast-ssd
---
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: ai-assistant-kibana
  namespace: ai-assistant-monitoring
spec:
  version: 8.11.0
  count: 1
  elasticsearchRef:
    name: ai-assistant-es
```

### Fluentd Configuration: `kubernetes/logging/fluentd-config.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: ai-assistant-monitoring
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type json
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter kubernetes.**>
      @type kubernetes_metadata
      @id filter_kube_metadata
      kubernetes_url "#{ENV['KUBERNETES_URL']}"
      verify_ssl "#{ENV['KUBERNETES_VERIFY_SSL']}"
    </filter>

    <filter kubernetes.var.log.containers.**.log>
      @type parser
      key_name log
      reserve_data true
      remove_key_name_field true
      <parse>
        @type multi_format
        <pattern>
          format json
        </pattern>
        <pattern>
          format none
        </pattern>
      </parse>
    </filter>

    <match kubernetes.var.log.containers.**ai-assistant**.log>
      @type elasticsearch
      host elasticsearch.ai-assistant-monitoring.svc.cluster.local
      port 9200
      logstash_format true
      logstash_prefix ai-assistant
      include_tag_key true
      type_name _doc
      tag_key @log_name
      <buffer>
        @type memory
        flush_interval 5s
        chunk_limit_size 2M
        queue_limit_length 32
        retry_max_interval 30
        retry_forever true
      </buffer>
    </match>
```

## 4. CI/CD Pipeline

### GitHub Actions Workflow: `.github/workflows/deploy.yml`
```yaml
name: Deploy Microservices

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [chat-service, model-gateway, knowledge-service, shell, chat-mfe]
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: '${{ matrix.service }}/package-lock.json'
    
    - name: Install dependencies
      working-directory: ./${{ matrix.service }}
      run: npm ci
    
    - name: Run tests
      working-directory: ./${{ matrix.service }}
      run: npm test
    
    - name: Run linting
      working-directory: ./${{ matrix.service }}
      run: npm run lint

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    strategy:
      matrix:
        service: [chat-service, model-gateway, knowledge-service, api-gateway, shell, chat-mfe, knowledge-mfe, ats-mfe, settings-mfe]
    permissions:
      contents: read
      packages: write
    steps:
    - uses: actions/checkout@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: ./${{ matrix.service }}
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'latest'
    
    - name: Set up Kustomize
      run: |
        curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
        sudo mv kustomize /usr/local/bin/
    
    - name: Update image tags
      run: |
        cd kubernetes/overlays/production
        kustomize edit set image \
          chat-service=${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/chat-service:latest \
          model-gateway=${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/model-gateway:latest \
          knowledge-service=${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/knowledge-service:latest \
          api-gateway=${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/api-gateway:latest
    
    - name: Deploy to Kubernetes
      env:
        KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
      run: |
        echo "$KUBE_CONFIG" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
        kubectl apply -k kubernetes/overlays/production
        kubectl rollout status deployment -n ai-assistant --timeout=10m
```

### ArgoCD Application: `kubernetes/argocd/application.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ai-assistant
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/ai-assistant
    targetRevision: HEAD
    path: kubernetes/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: ai-assistant
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
    - Validate=true
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## 5. Terraform Infrastructure

### AWS EKS Cluster: `terraform/eks.tf`
```hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "ai-assistant-cluster"
  cluster_version = "1.27"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  enable_irsa = true

  eks_managed_node_group_defaults = {
    ami_type       = "AL2_x86_64"
    instance_types = ["m5.large"]
  }

  eks_managed_node_groups = {
    general = {
      name = "general-workloads"

      min_size     = 2
      max_size     = 10
      desired_size = 3

      instance_types = ["t3.large"]
      
      k8s_labels = {
        Environment = "production"
        Workload    = "general"
      }
    }

    gpu = {
      name = "gpu-workloads"

      min_size     = 0
      max_size     = 5
      desired_size = 1

      instance_types = ["g4dn.xlarge"]
      
      k8s_labels = {
        Environment = "production"
        Workload    = "ai-inference"
      }

      taints = [
        {
          key    = "nvidia.com/gpu"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]
    }
  }
}

# OIDC Provider for IRSA
data "tls_certificate" "eks" {
  url = module.eks.cluster_oidc_issuer_url
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = module.eks.cluster_oidc_issuer_url
}
```

### RDS for PostgreSQL: `terraform/rds.tf`
```hcl
module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "ai-assistant-db"

  engine            = "postgres"
  engine_version    = "15.3"
  instance_class    = "db.r6g.large"
  allocated_storage = 100
  storage_encrypted = true

  db_name  = "aiassistant"
  username = "aiassistant"
  port     = "5432"

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.database.name

  backup_retention_period = 30
  backup_window          = "03:00-06:00"
  maintenance_window     = "Mon:00:00-Mon:03:00"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  create_monitoring_role = true
  monitoring_interval    = "30"
  monitoring_role_name   = "ai-assistant-rds-monitoring"

  parameters = [
    {
      name  = "shared_preload_libraries"
      value = "pg_stat_statements"
    }
  ]
}
```

### ElastiCache for Redis: `terraform/elasticache.tf`
```hcl
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "ai-assistant-redis"
  replication_group_description = "Redis cluster for AI Assistant"
  
  engine               = "redis"
  engine_version       = "7.0"
  node_type           = "cache.r6g.large"
  number_cache_clusters = 3
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  subnet_group_name = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth.result
  
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
  
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }
}
```

## 6. Security Configuration

### Network Policies: `kubernetes/security/network-policies.yaml`
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: chat-service-netpol
  namespace: ai-assistant
spec:
  podSelector:
    matchLabels:
      app: chat-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    - podSelector:
        matchLabels:
          app: model-gateway
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - podSelector:
        matchLabels:
          app: rabbitmq
    ports:
    - protocol: TCP
      port: 5672
```

### Pod Security Policies: `kubernetes/security/pod-security.yaml`
```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  supplementalGroups:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

## 7. Backup and Disaster Recovery

### Velero Backup Configuration: `kubernetes/backup/velero-schedule.yaml`
```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  template:
    includedNamespaces:
    - ai-assistant
    - ai-assistant-monitoring
    ttl: 720h0m0s  # 30 days
    storageLocation: default
    volumeSnapshotLocations:
    - default
    hooks:
      resources:
      - name: postgres-backup
        includedNamespaces:
        - ai-assistant
        labelSelector:
          matchLabels:
            app: postgres
        pre:
        - exec:
            container: postgres
            command:
            - /bin/bash
            - -c
            - pg_dumpall -U postgres > /backup/full-backup.sql
            onError: Fail
            timeout: 30m
```

### Database Backup Script: `scripts/backup-databases.sh`
```bash
#!/bin/bash

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/${TIMESTAMP}"
S3_BUCKET="s3://ai-assistant-backups"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
kubectl exec -n ai-assistant postgres-0 -- \
  pg_dumpall -U postgres | gzip > ${BACKUP_DIR}/postgres_${TIMESTAMP}.sql.gz

# Backup Redis
echo "Backing up Redis..."
kubectl exec -n ai-assistant redis-master-0 -- \
  redis-cli BGSAVE
sleep 10
kubectl cp ai-assistant/redis-master-0:/data/dump.rdb \
  ${BACKUP_DIR}/redis_${TIMESTAMP}.rdb

# Backup Elasticsearch
echo "Backing up Elasticsearch..."
curl -X PUT "elasticsearch.ai-assistant-monitoring:9200/_snapshot/backup_repo/${TIMESTAMP}?wait_for_completion=true" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "ai-assistant-*",
    "include_global_state": false
  }'

# Upload to S3
echo "Uploading backups to S3..."
aws s3 sync ${BACKUP_DIR} ${S3_BUCKET}/${TIMESTAMP}

# Clean up old backups (keep last 30 days)
find /backups -type d -mtime +30 -exec rm -rf {} \;

# Verify backup
if [ $? -eq 0 ]; then
  echo "Backup completed successfully: ${TIMESTAMP}"
  # Send notification
  curl -X POST ${SLACK_WEBHOOK} \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"Database backup completed successfully: ${TIMESTAMP}\"}"
else
  echo "Backup failed!"
  # Send alert
  curl -X POST ${SLACK_WEBHOOK} \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"DATABASE BACKUP FAILED: ${TIMESTAMP}\"}"
  exit 1
fi
```

## 8. Performance Optimization

### HPA Configuration: `kubernetes/autoscaling/hpa.yaml`
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: chat-service-hpa
  namespace: ai-assistant
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chat-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: websocket_connections_per_pod
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 4
        periodSeconds: 30
      selectPolicy: Max
```

### VPA Configuration: `kubernetes/autoscaling/vpa.yaml`
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: model-gateway-vpa
  namespace: ai-assistant
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: model-gateway
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: model-gateway
      minAllowed:
        cpu: 500m
        memory: 1Gi
      maxAllowed:
        cpu: 4
        memory: 8Gi
      controlledResources: ["cpu", "memory"]
```

## 9. Cost Optimization

### Spot Instance Configuration: `terraform/spot-instances.tf`
```hcl
resource "aws_eks_node_group" "spot" {
  cluster_name    = module.eks.cluster_name
  node_group_name = "spot-workloads"
  node_role_arn   = aws_iam_role.eks_node_group.arn
  subnet_ids      = module.vpc.private_subnets

  capacity_type = "SPOT"
  
  scaling_config {
    desired_size = 2
    max_size     = 10
    min_size     = 0
  }

  instance_types = ["t3.large", "t3a.large", "t2.large"]

  labels = {
    workload-type = "spot-eligible"
    Environment   = "production"
  }

  taints {
    key    = "spot-instance"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  tags = {
    "k8s.io/cluster-autoscaler/enabled" = "true"
    "k8s.io/cluster-autoscaler/${module.eks.cluster_name}" = "owned"
  }
}
```

### Karpenter Configuration: `kubernetes/karpenter/provisioner.yaml`
```yaml
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: default
spec:
  requirements:
    - key: karpenter.sh/capacity-type
      operator: In
      values: ["spot", "on-demand"]
    - key: kubernetes.io/arch
      operator: In
      values: ["amd64"]
    - key: node.kubernetes.io/instance-type
      operator: In
      values: 
        - t3.medium
        - t3.large
        - t3.xlarge
        - t3a.medium
        - t3a.large
        - t3a.xlarge
  limits:
    resources:
      cpu: 1000
      memory: 1000Gi
  consolidation:
    enabled: true
  ttlSecondsAfterEmpty: 30
  providerRef:
    name: default
---
apiVersion: karpenter.k8s.aws/v1alpha1
kind: AWSNodeTemplate
metadata:
  name: default
spec:
  subnetSelector:
    karpenter.sh/discovery: "ai-assistant-cluster"
  securityGroupSelector:
    karpenter.sh/discovery: "ai-assistant-cluster"
  instanceStorePolicy: RAID0
  userData: |
    #!/bin/bash
    /etc/eks/bootstrap.sh ai-assistant-cluster
    echo "net.core.somaxconn = 1024" >> /etc/sysctl.conf
    sysctl -p
```

## Deployment Checklist

- [ ] Infrastructure provisioned with Terraform
- [ ] Kubernetes cluster configured
- [ ] Istio service mesh installed
- [ ] Monitoring stack deployed
- [ ] SSL certificates configured
- [ ] Database migrations completed
- [ ] Secrets management configured
- [ ] Backup strategy implemented
- [ ] CI/CD pipelines tested
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Documentation updated
- [ ] Runbooks created
- [ ] Team training completed