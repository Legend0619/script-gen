const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { SpeechClient } = require("@google-cloud/speech");

const app = express();
const port = process.env.PORT || 5000;

// Set up Multer middleware to handle file uploads
const upload = multer({ dest: "uploads/" });

// Set up Google Cloud Speech-to-Text client
const speechClient = new SpeechClient();

// Set up route to handle file uploads and speech recognition requests
app.post("/transcribe", upload.single("video"), async (req, res) => {
  try {
    // Read the uploaded video file
    const videoFile = fs.readFileSync("uploads/" + req.file.filename);

    // Call Google Cloud Speech-to-Text to transcribe the video file
    const [operation] = speechClient.longRunningRecognize({
      audio: {
        content: videoFile,
      },
      config: {
        enableWordTimeOffsets: true,
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: "en-US",
      },
    });
    const [response] = await operation.promise();

    // Extract transcript with timestamps from API response
    const transcript = response.results
      .map((result) => result.alternatives[0])
      .map((alternative) => ({
        text: alternative.transcript,
        start_time:
          alternative.words[0].startTime.seconds +
          alternative.words[0].startTime.nanos / 1e9,
        end_time:
          alternative.words[alternative.words.length - 1].endTime.seconds +
          alternative.words[alternative.words.length - 1].endTime.nanos / 1e9,
      }));

    // Return transcript with timestamps as JSON response
    res.json(transcript);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error generating transcript");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
