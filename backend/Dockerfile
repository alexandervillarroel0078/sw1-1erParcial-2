# Stage 1: build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests

# Stage 2: runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -jar app.jar --spring.data.mongodb.uri=mongodb+srv://villarroelalexander215_db_user:94IYbUMCmJ8ZWh9c@cluster0.mdrsqmq.mongodb.net/dpn_workflow?appName=Cluster0"]
# force rebuild v2
