# SIGFEC em um único container: telas (PWA) + API na mesma origem.
# O banco fica fora (PostgreSQL gerenciado, ex.: Neon) — passe DB_URL, DB_USER, DB_PASSWORD.

# 1) Telas
FROM node:20-alpine AS front
WORKDIR /front
COPY sigfec-front/package*.json ./
RUN npm ci
COPY sigfec-front/ ./
RUN npm run build

# 2) Backend com as telas embutidas em /static
FROM maven:3.9-eclipse-temurin-21 AS back
WORKDIR /back
COPY SIGFEC-backend/pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY SIGFEC-backend/src ./src
COPY --from=front /front/dist ./src/main/resources/static
RUN mvn -q -B -DskipTests package && cp target/sigfec-*.jar /app.jar

# 3) Execução (planos grátis têm ~512 MB: limita a heap)
FROM eclipse-temurin:21-jre-alpine
COPY --from=back /app.jar /app.jar
ENV TZ=America/Sao_Paulo
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
