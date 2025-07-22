# Migration Guide & Best Practices

## Overview
This guide provides a step-by-step migration strategy from monolithic architecture to microservices and microfrontends, including best practices and common pitfalls to avoid.

## Migration Phases

### Phase 1: Preparation (Week 1-2)

#### 1.1 Assessment Checklist
- [ ] Document current architecture
- [ ] Identify all external dependencies
- [ ] Map data flows and integrations
- [ ] Create dependency graph
- [ ] Identify high-risk areas
- [ ] Set up monitoring baseline
- [ ] Document current deployment process
- [ ] Inventory all environment variables and configs

#### 1.2 Team Preparation
```bash
# Training resources setup
mkdir -p migration/training
cat > migration/training/README.md << EOF
# Team Training Plan

## Week 1: Microservices Fundamentals
- Distributed systems concepts
- Service mesh basics
- Container orchestration with K8s
- Event-driven architecture

## Week 2: Hands-on Labs
- Docker containerization
- Kubernetes deployments
- Service communication patterns
- Monitoring and debugging
EOF
```

#### 1.3 Infrastructure Setup
```bash
# Create migration workspace
mkdir -p migration/{scripts,configs,documentation}

# Initialize infrastructure
cd migration
terraform init
terraform plan -out=infrastructure.tfplan

# Create staging environment
kubectl create namespace ai-assistant-staging
kubectl label namespace ai-assistant-staging environment=staging
```

### Phase 2: Service Extraction (Week 3-6)

#### 2.1 Strangler Fig Pattern Implementation
```typescript
// api-gateway/src/middleware/legacyProxy.ts
import { Request, Response, NextFunction } from 'express';
import httpProxy from 'http-proxy-middleware';

const legacyAppUrl = process.env.LEGACY_APP_URL || 'http://legacy-app:3000';

export const createLegacyProxy = (migrationConfig: MigrationConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    
    // Check if this route has been migrated
    if (migrationConfig.migratedRoutes.includes(path)) {
      // Route to new microservice
      next();
    } else {
      // Proxy to legacy application
      httpProxy.createProxyMiddleware({
        target: legacyAppUrl,
        changeOrigin: true,
        onProxyReq: (proxyReq, req) => {
          // Add migration headers for tracking
          proxyReq.setHeader('X-Migration-Status', 'legacy');
          proxyReq.setHeader('X-Original-Path', req.path);
        },
        onProxyRes: (proxyRes, req, res) => {
          // Log legacy usage for migration tracking
          logger.info('Legacy route accessed', {
            path: req.path,
            method: req.method,
            timestamp: new Date()
          });
        }
      })(req, res, next);
    }
  };
};
```

#### 2.2 Database Migration Strategy
```sql
-- Step 1: Create read replicas for each service
CREATE DATABASE chat_service_db;
CREATE DATABASE knowledge_service_db;

-- Step 2: Set up logical replication
CREATE PUBLICATION chat_service_pub FOR TABLE 
  messages, conversations, branches;

CREATE SUBSCRIPTION chat_service_sub
  CONNECTION 'host=legacy-db port=5432 dbname=aiassistant'
  PUBLICATION chat_service_pub;

-- Step 3: Create service-specific views during transition
CREATE VIEW legacy_messages AS
  SELECT * FROM legacy_db.messages
  UNION ALL
  SELECT * FROM messages;
```

#### 2.3 Event Sourcing Implementation
```typescript
// shared/events/eventStore.ts
interface DomainEvent {
  id: string;
  aggregateId: string;
  type: string;
  data: any;
  metadata: {
    timestamp: Date;
    userId: string;
    version: number;
  };
}

export class EventStore {
  async append(event: DomainEvent): Promise<void> {
    // Store event
    await this.db.events.insert(event);
    
    // Publish to message bus
    await this.messageBus.publish(event.type, event);
    
    // Update projections
    await this.projectionManager.handle(event);
  }

  async getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]> {
    return this.db.events.find({
      aggregateId,
      'metadata.version': { $gte: fromVersion || 0 }
    }).sort({ 'metadata.version': 1 });
  }
}
```

### Phase 3: Frontend Migration (Week 7-8)

#### 3.1 Incremental MFE Migration
```javascript
// shell/src/components/MigrationWrapper.tsx
import React, { Suspense, lazy } from 'react';
import { useFeatureFlag } from '../hooks/useFeatureFlag';

const LegacyChat = lazy(() => import('../legacy/Chat'));
const NewChatMFE = lazy(() => import('chat/ChatApp'));

export const MigrationWrapper: React.FC<{ feature: string }> = ({ feature }) => {
  const isNewFeatureEnabled = useFeatureFlag(`new_${feature}_mfe`);
  
  return (
    <ErrorBoundary fallback={<LegacyChat />}>
      <Suspense fallback={<div>Loading...</div>}>
        {isNewFeatureEnabled ? <NewChatMFE /> : <LegacyChat />}
      </Suspense>
    </ErrorBoundary>
  );
};
```

#### 3.2 Shared State Migration
```typescript
// migration/stateSync.ts
export class StateMigrationService {
  private oldStore: any;
  private newStore: any;

  async migrateUserSession() {
    // Read from old localStorage
    const oldSession = localStorage.getItem('ai-assistant-session');
    
    if (oldSession) {
      const parsed = JSON.parse(oldSession);
      
      // Transform to new format
      const newFormat = {
        user: parsed.user,
        preferences: this.transformPreferences(parsed.settings),
        conversations: await this.migrateConversations(parsed.chats)
      };
      
      // Save to new store
      this.newStore.setState(newFormat);
      
      // Mark as migrated
      localStorage.setItem('session-migrated', 'true');
    }
  }

  private async migrateConversations(oldChats: any[]) {
    return Promise.all(oldChats.map(async chat => ({
      id: chat.id,
      messages: await this.transformMessages(chat.messages),
      metadata: {
        created: new Date(chat.timestamp),
        updated: new Date(chat.lastUpdate),
        migrated: true
      }
    })));
  }
}
```

### Phase 4: Data Migration (Week 9-10)

#### 4.1 Zero-Downtime Migration Script
```bash
#!/bin/bash
# migration/scripts/zero-downtime-migration.sh

set -euo pipefail

echo "Starting zero-downtime migration..."

# Step 1: Enable dual writes
echo "Enabling dual writes..."
kubectl set env deployment/legacy-app ENABLE_DUAL_WRITES=true

# Step 2: Start background sync
echo "Starting background data sync..."
kubectl apply -f migration/jobs/data-sync-job.yaml

# Step 3: Wait for sync to catch up
while true; do
  LAG=$(kubectl exec -n ai-assistant postgres-0 -- \
    psql -U postgres -d aiassistant -t -c \
    "SELECT MAX(lag) FROM replication_status;")
  
  if [ "$LAG" -lt "1000" ]; then
    echo "Replication lag acceptable: ${LAG}ms"
    break
  fi
  
  echo "Waiting for replication lag to decrease: ${LAG}ms"
  sleep 10
done

# Step 4: Switch reads to new services
echo "Switching reads to new services..."
kubectl patch configmap app-config -n ai-assistant \
  --type merge -p '{"data":{"READ_FROM_NEW_DB":"true"}}'

# Step 5: Verify data consistency
echo "Verifying data consistency..."
kubectl apply -f migration/jobs/consistency-check.yaml
kubectl wait --for=condition=complete job/consistency-check -n ai-assistant

# Step 6: Disable writes to old system
echo "Disabling writes to legacy system..."
kubectl set env deployment/legacy-app LEGACY_WRITES_ENABLED=false

echo "Migration completed successfully!"
```

#### 4.2 Data Consistency Checker
```typescript
// migration/consistency-checker.ts
export class ConsistencyChecker {
  async checkDataConsistency(): Promise<ConsistencyReport> {
    const report: ConsistencyReport = {
      timestamp: new Date(),
      services: {},
      overallStatus: 'healthy'
    };

    // Check each service
    for (const service of this.services) {
      const legacyCount = await this.legacyDb.count(service.table);
      const newCount = await this.getServiceDb(service).count(service.table);
      
      const samples = await this.compareSamples(service);
      
      report.services[service.name] = {
        legacyCount,
        newCount,
        difference: Math.abs(legacyCount - newCount),
        samplesMatch: samples.every(s => s.match),
        issues: samples.filter(s => !s.match)
      };
      
      if (report.services[service.name].issues.length > 0) {
        report.overallStatus = 'inconsistent';
      }
    }

    return report;
  }

  private async compareSamples(service: Service): Promise<SampleComparison[]> {
    const sampleIds = await this.getSampleIds(service.table, 100);
    
    return Promise.all(sampleIds.map(async id => {
      const legacyRecord = await this.legacyDb.findById(service.table, id);
      const newRecord = await this.getServiceDb(service).findById(service.table, id);
      
      return {
        id,
        match: this.deepEqual(legacyRecord, newRecord),
        differences: this.findDifferences(legacyRecord, newRecord)
      };
    }));
  }
}
```

### Phase 5: Cutover (Week 11)

#### 5.1 Cutover Checklist
```yaml
# migration/cutover-checklist.yaml
cutover:
  pre_checks:
    - name: "Data consistency verification"
      command: "kubectl apply -f migration/jobs/final-consistency-check.yaml"
      expected: "100% match rate"
    
    - name: "Service health checks"
      command: "kubectl get pods -n ai-assistant -o wide"
      expected: "All pods running"
    
    - name: "Load test new infrastructure"
      command: "./scripts/load-test.sh --target=new"
      expected: "P99 < 500ms"
    
    - name: "Backup verification"
      command: "./scripts/verify-backups.sh"
      expected: "All backups valid"

  cutover_steps:
    - step: 1
      name: "Enable maintenance mode"
      rollback: "kubectl delete configmap maintenance-mode"
    
    - step: 2
      name: "Final data sync"
      rollback: "kubectl delete job final-sync"
    
    - step: 3
      name: "Update DNS/Load Balancer"
      rollback: "terraform apply -var 'use_legacy=true'"
    
    - step: 4
      name: "Smoke tests"
      rollback: "kubectl apply -f emergency-rollback.yaml"

  post_checks:
    - "User authentication working"
    - "Chat functionality operational"
    - "No 5xx errors in past 5 minutes"
    - "Database connections stable"
```

#### 5.2 Rollback Plan
```bash
#!/bin/bash
# migration/scripts/emergency-rollback.sh

echo "INITIATING EMERGENCY ROLLBACK!"

# Step 1: Redirect traffic back to legacy
kubectl patch service api-gateway -n ai-assistant \
  -p '{"spec":{"selector":{"app":"legacy-app"}}}'

# Step 2: Stop new service writes
kubectl scale deployment --replicas=0 -n ai-assistant \
  chat-service model-gateway knowledge-service

# Step 3: Restore from backup if needed
if [ "$1" == "--restore-data" ]; then
  echo "Restoring data from backup..."
  kubectl apply -f migration/jobs/restore-backup.yaml
fi

# Step 4: Clear caches
kubectl delete pods -l app=redis -n ai-assistant

# Step 5: Notify team
curl -X POST $SLACK_WEBHOOK \
  -d '{"text":"🚨 EMERGENCY ROLLBACK INITIATED! Check runbooks."}'

echo "Rollback completed. Legacy system restored."
```

## Best Practices

### 1. Service Design Principles

#### Domain Boundaries
```typescript
// ❌ Bad: Tight coupling between services
class ChatService {
  async createMessage(data: MessageData) {
    // Direct database call to another service's DB
    const user = await this.userDb.findById(data.userId);
    const knowledge = await this.knowledgeDb.getContext(data.query);
    // ...
  }
}

// ✅ Good: Loose coupling with events
class ChatService {
  async createMessage(data: MessageData) {
    const message = await this.messageRepo.create(data);
    
    // Publish event for other services
    await this.eventBus.publish('message.created', {
      messageId: message.id,
      userId: data.userId,
      conversationId: data.conversationId
    });
    
    return message;
  }
}
```

#### API Versioning
```typescript
// routes/v1/index.ts
router.use('/api/v1/chat', chatRouterV1);

// routes/v2/index.ts - Breaking changes
router.use('/api/v2/chat', chatRouterV2);

// Middleware for version negotiation
app.use((req, res, next) => {
  const version = req.headers['api-version'] || 'v1';
  req.apiVersion = version;
  next();
});
```

### 2. Data Management

#### Event Sourcing Pattern
```typescript
// ✅ Good: Event-driven state changes
class ConversationAggregate {
  private events: DomainEvent[] = [];
  
  createMessage(content: string, userId: string) {
    const event = {
      type: 'MessageCreated',
      data: { content, userId },
      timestamp: new Date()
    };
    
    this.applyEvent(event);
    this.events.push(event);
  }
  
  getUncommittedEvents() {
    return this.events;
  }
}
```

#### CQRS Implementation
```typescript
// Write model
class MessageCommandHandler {
  async handle(command: CreateMessageCommand) {
    const message = new Message(command);
    await this.repository.save(message);
    await this.eventStore.append(message.getEvents());
  }
}

// Read model
class MessageQueryHandler {
  async getConversationView(conversationId: string) {
    // Optimized read from denormalized view
    return this.readDb.conversationViews.findOne({ id: conversationId });
  }
}
```

### 3. Testing Strategies

#### Contract Testing
```typescript
// consumer-contract.test.ts
describe('Chat Service Consumer Contract', () => {
  it('should handle message.created event', async () => {
    const event = {
      type: 'message.created',
      data: {
        messageId: '123',
        userId: 'user-1',
        content: 'Hello'
      }
    };
    
    const result = await chatService.handleMessageCreated(event);
    
    expect(result).toMatchContract({
      acknowledged: true,
      processed: true
    });
  });
});
```

#### Chaos Engineering
```yaml
# chaos/network-delay.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay
spec:
  selector:
    namespaces:
      - ai-assistant
  mode: all
  action: delay
  delay:
    latency: "100ms"
    correlation: "25"
    jitter: "10ms"
  duration: "5m"
```

### 4. Monitoring & Observability

#### Distributed Tracing
```typescript
// middleware/tracing.ts
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tracer = trace.getTracer('ai-assistant');
  const span = tracer.startSpan(`${req.method} ${req.path}`);
  
  // Add trace context to request
  req.traceId = span.spanContext().traceId;
  
  // Inject context for propagation
  context.with(trace.setSpan(context.active(), span), () => {
    // Add span attributes
    span.setAttributes({
      'http.method': req.method,
      'http.url': req.url,
      'user.id': req.user?.id
    });
    
    // Handle response
    const originalSend = res.send;
    res.send = function(data) {
      span.setAttributes({
        'http.status_code': res.statusCode
      });
      
      if (res.statusCode >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      
      span.end();
      return originalSend.call(this, data);
    };
    
    next();
  });
};
```

#### Custom Metrics
```typescript
// metrics/custom.ts
import { metrics } from '@opentelemetry/api-metrics';

const meter = metrics.getMeter('ai-assistant');

// Business metrics
const messageCounter = meter.createCounter('messages_total', {
  description: 'Total number of messages processed'
});

const inferenceLatency = meter.createHistogram('inference_duration_ms', {
  description: 'AI model inference latency'
});

export const recordMessage = (labels: Record<string, string>) => {
  messageCounter.add(1, labels);
};

export const recordInference = (duration: number, model: string) => {
  inferenceLatency.record(duration, { model });
};
```

### 5. Security Best Practices

#### Service-to-Service Authentication
```typescript
// middleware/serviceAuth.ts
import jwt from 'jsonwebtoken';

export const generateServiceToken = (serviceName: string) => {
  return jwt.sign(
    {
      iss: serviceName,
      aud: 'ai-assistant-services',
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 300 // 5 minutes
    },
    process.env.SERVICE_SECRET,
    { algorithm: 'RS256' }
  );
};

export const verifyServiceToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-service-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Missing service token' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.SERVICE_PUBLIC_KEY);
    req.serviceAuth = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid service token' });
  }
};
```

## Common Pitfalls & Solutions

### 1. Distributed Transactions
```typescript
// ❌ Avoid: Distributed transactions
async function createOrder() {
  const transaction = await db.beginTransaction();
  try {
    await orderService.create(order);
    await inventoryService.reserve(items);
    await paymentService.charge(amount);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
  }
}

// ✅ Use: Saga pattern
class OrderSaga {
  async execute(order: Order) {
    const saga = new SagaTransaction();
    
    saga.addStep({
      action: () => orderService.create(order),
      compensation: () => orderService.delete(order.id)
    });
    
    saga.addStep({
      action: () => inventoryService.reserve(order.items),
      compensation: () => inventoryService.release(order.items)
    });
    
    saga.addStep({
      action: () => paymentService.charge(order.amount),
      compensation: () => paymentService.refund(order.id)
    });
    
    return saga.execute();
  }
}
```

### 2. Data Consistency
```typescript
// Eventual consistency handler
class EventualConsistencyManager {
  async ensureConsistency() {
    const inconsistencies = await this.detectInconsistencies();
    
    for (const issue of inconsistencies) {
      await this.reconcile(issue);
      await this.notifyMonitoring(issue);
    }
  }
  
  private async reconcile(issue: ConsistencyIssue) {
    switch (issue.type) {
      case 'MISSING_EVENT':
        await this.replayEvent(issue.eventId);
        break;
      case 'OUT_OF_ORDER':
        await this.reorderEvents(issue.events);
        break;
      case 'DUPLICATE':
        await this.deduplicateEvent(issue.eventId);
        break;
    }
  }
}
```

### 3. Performance Issues
```typescript
// Caching strategy
class CacheManager {
  private caches = new Map<string, CacheStrategy>();
  
  constructor() {
    this.caches.set('user', new RedisCache({ ttl: 3600 }));
    this.caches.set('conversation', new RedisCache({ ttl: 1800 }));
    this.caches.set('inference', new MemoryCache({ maxSize: 100 }));
  }
  
  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const [type, id] = key.split(':');
    const cache = this.caches.get(type);
    
    if (!cache) {
      return fetcher();
    }
    
    let value = await cache.get(key);
    if (!value) {
      value = await fetcher();
      await cache.set(key, value);
    }
    
    return value;
  }
}
```

## Success Metrics

### Technical Metrics
- Service uptime > 99.9%
- P95 latency < 200ms
- Zero data loss during migration
- Deployment frequency increased by 5x
- MTTR (Mean Time To Recovery) < 15 minutes

### Business Metrics
- User satisfaction score maintained or improved
- Feature delivery speed increased by 40%
- Infrastructure costs optimized by 30%
- Developer productivity increased
- Time to market for new features reduced by 50%

## Post-Migration Checklist

- [ ] All services deployed and healthy
- [ ] Monitoring dashboards configured
- [ ] Alerts and runbooks created
- [ ] Team trained on new architecture
- [ ] Documentation updated
- [ ] Legacy system decommissioned
- [ ] Cost optimization implemented
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Disaster recovery tested