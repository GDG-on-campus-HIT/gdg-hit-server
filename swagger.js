const swaggerAutogen = require("swagger-autogen");

const doc = {
    info: {
        title: "Auth Service API",
        description: "Automatically generated swagger docs",
        version: "1.0.0",
    },
    host: "localhost:8080/api/v1",
    schemes: ["http"],
};

const outputFile = "./swagger-output.json";

const endpointsFiles = [
    // "./routes/user.route.ts", 
    // "./routes/members.route.ts",
    //  "./routes/event.route.ts",
     "./routes/eventregistration.route.ts",
     "./routes/quiz.route.ts"
    ]

swaggerAutogen()(outputFile, endpointsFiles, doc);