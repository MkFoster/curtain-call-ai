const axios = require("axios");
const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const imageGenEndpointUrl = `https://${process.env.GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.GCP_LOCATION}/publishers/google/models/imagegeneration@006:predict`;

async function getAccessToken() {
    try {
        const { stdout } = await exec("gcloud auth print-access-token");
        return stdout.trim(); // Remove any trailing newline characters
    } catch (error) {
        console.error("Error getting access token:", error);
        throw error; // Re-throw to allow handling in generateImage function
    }
}

async function generateAndDownloadImage(prompt, outputPath) {
    const requestData = {
        instances: [
            {
                prompt: prompt,
            },
        ],
        parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
        },
    };
    try {
        // Get access token (replace with your actual method)
        const accessToken = await getAccessToken(); // Replace with your token retrieval method

        const response = await axios.post(imageGenEndpointUrl, requestData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json; charset=utf-8",
            },
        });

        // Parse the response
        const responseData = response.data;
        const imageDataBase64 = responseData.predictions[0].bytesBase64Encoded;

        // Decode base64 and save image
        const buffer = Buffer.from(imageDataBase64, "base64");
        fs.writeFileSync(outputPath, buffer);
        console.log("Image saved to: ", outputPath);
    } catch (error) {
        console.error("Failed to generate or download the image:", error);
    }
}

// Example usage:
generateAndDownloadImage(
    "Stage with the curtains open.",
    "shows/test-image.png"
);
