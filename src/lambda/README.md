# 🔄 LUPITA LAMBDA - Procesador de Llamadas

## ¿Qué hace?

Cuando una grabación llega a S3 Active, Lambda automáticamente:

1. **Copia a S3 Legal** — Retención 1 año (LFPDPPP México)
2. **Transcribe audio** — AWS Transcribe (español mexicano)
3. **Analiza contenido** — 16 códigos de comportamiento + emociones
4. **Guarda en Supabase** — Datos estructurados
5. **Envía a Weaviate** — Embeddings anonimizados

---

## 📋 Setup en AWS (30 minutos)

### 1. Crear Buckets S3
```bash
# Bucket Legal (retención 1 año)
aws s3 mb s3://saludcompartida-legal-TUIDENTIFICADOR --region us-east-1

# Bucket Active (procesamiento)
aws s3 mb s3://saludcompartida-active-TUIDENTIFICADOR --region us-east-1
```

### 2. Configurar retención en Bucket Legal
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket saludcompartida-legal-TUIDENTIFICADOR \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "RetenerUnAno",
        "Status": "Enabled",
        "Filter": {"Prefix": "recordings/"},
        "Expiration": {"Days": 365},
        "NoncurrentVersionExpiration": {"NoncurrentDays": 365}
      }
    ]
  }'
```

### 3. Crear rol IAM para Lambda
```bash
aws iam create-role \
  --role-name LupitaLambdaRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
```

### 4. Adjuntar políticas al rol
```bash
# Acceso a S3
aws iam attach-role-policy \
  --role-name LupitaLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Acceso a Transcribe
aws iam attach-role-policy \
  --role-name LupitaLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonTranscribeFullAccess

# Logs en CloudWatch
aws iam attach-role-policy \
  --role-name LupitaLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
```

### 5. Crear función Lambda
```bash
cd lambda

# Instalar dependencias
npm install

# Crear ZIP
zip -r lambda-package.zip .

# Crear función
aws lambda create-function \
  --function-name lupita-process-call \
  --runtime nodejs18.x \
  --role arn:aws:iam::TUCUENTA:role/LupitaLambdaRole \
  --handler process-call.handler \
  --zip-file fileb://lambda-package.zip \
  --timeout 300 \
  --memory-size 512 \
  --environment Variables="{
    S3_BUCKET_LEGAL=saludcompartida-legal-TUIDENTIFICADOR,
    S3_BUCKET_ACTIVE=saludcompartida-active-TUIDENTIFICADOR,
    SUPABASE_URL=https://tuproyecto.supabase.co,
    SUPABASE_SERVICE_KEY=tu-service-key,
    WEAVIATE_URL=https://tu-cluster.weaviate.network,
    WEAVIATE_API_KEY=tu-weaviate-key
  }"
```

### 6. Configurar trigger S3 → Lambda
```bash
# Dar permiso a S3 para invocar Lambda
aws lambda add-permission \
  --function-name lupita-process-call \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::saludcompartida-active-TUIDENTIFICADOR

# Configurar notificación en S3
aws s3api put-bucket-notification-configuration \
  --bucket saludcompartida-active-TUIDENTIFICADOR \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:TUCUENTA:function:lupita-process-call",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [{
            "Name": "prefix",
            "Value": "recordings/"
          }, {
            "Name": "suffix",
            "Value": ".wav"
          }]
        }
      }
    }]
  }'
```

---

## 🔄 Actualizar Lambda (después de cambios)
```bash
cd lambda
npm install
zip -r lambda-package.zip .
aws lambda update-function-code \
  --function-name lupita-process-call \
  --zip-file fileb://lambda-package.zip
```

O simplemente:
```bash
npm run zip
npm run deploy
```

---

## 🧪 Probar Lambda

### Test local (simular evento S3):
```bash
aws lambda invoke \
  --function-name lupita-process-call \
  --payload '{
    "Records": [{
      "s3": {
        "bucket": {"name": "saludcompartida-active-TUIDENTIFICADOR"},
        "object": {"key": "recordings/123/call_456/audio-full.wav"}
      }
    }]
  }' \
  response.json

cat response.json
```

---

## 📊 Monitoreo

### Ver logs en CloudWatch:
```bash
aws logs tail /aws/lambda/lupita-process-call --follow
```

### Ver métricas:

1. Ve a AWS Console → Lambda → lupita-process-call
2. Tab "Monitor"
3. Ver invocaciones, errores, duración

---

## 💰 Costos estimados

| Servicio | Uso mensual (100 llamadas) | Costo |
|----------|---------------------------|-------|
| Lambda | 100 invocaciones × 30s | ~$0.10 |
| S3 Legal | 1 GB storage | ~$0.02 |
| S3 Active | 1 GB transfer | ~$0.02 |
| Transcribe | 400 minutos | ~$10.00 |
| **Total** | | **~$10/mes** |

---

## 🚨 Troubleshooting

### "Access Denied" en S3
- Verificar que el rol tenga `AmazonS3FullAccess`
- Verificar nombre del bucket

### Lambda timeout
- Aumentar timeout a 300 segundos
- Aumentar memoria a 512 MB

### Transcribe falla
- Verificar que el audio sea .wav o .mp3
- Verificar que la región soporte es-MX

### No llega a Weaviate
- Verificar WEAVIATE_URL y WEAVIATE_API_KEY
- Lambda necesita acceso a internet (VPC config)

---

## 📁 Estructura
```
lambda/
├── process-call.js    # Código principal
├── package.json       # Dependencias
├── README.md          # Esta documentación
└── lambda-package.zip # (generado) Para deploy
```
```

3. **Guarda** (`Cmd + S`)

---

## ✅ ¡Lambda completa!

Ahora tienes:
```
lambda/
├── process-call.js  ✅
├── package.json     ✅
└── README.md        ✅