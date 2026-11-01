# 替换 site-api 容器。镜像监听 3001，路径仍是 /api，nginx 无需去掉前缀。
# 默认堆 256m。内存更宽裕时可覆盖 JAVA_OPTS，例如 -Xmx512m。

FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app --home-dir /app app
COPY --from=build --chown=10001:10001 /src/target/konbini-api.jar /app/konbini-api.jar
USER app
EXPOSE 3001
ENV PORT=3001 \
    LISTEN_HOST=0.0.0.0 \
    JAVA_OPTS="-Xms64m -Xmx256m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/konbini-api.jar"]
