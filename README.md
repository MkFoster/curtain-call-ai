# curtain-call-ai

Use Google Gemini to author and direct a mini-stage production.

## Installation 🚀

-   Download and install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installer for your operating system
-   Open a command prompt and create a your credential file:

```
gcloud auth application-default login
```

-   Checkout this repo
-   CD into the checkout folder (I.e., cd curtain-call-ai)
-   Run "npm i" to install all the Node dependencies
-   Create a .env file in the checkout folder and add a line with your Gemini API key:

```
API_KEY=YOUR-API-KEY
```

### Windows MP3 player setup

-   Download the cmdmp3 executables from [the cmdmp3 folder on Github](https://github.com/jimlawless/cmdmp3), unzip it and copy the cmdmp3.exe file your curtain-call-ai folder. This is needed to play an MP3 file from the command line via the Curtain Call Node app so your show will have sound. Many thanks to [Jim Lawless](https://jimlawless.net/) for building and maintaining this utility.

### Linux MP3 player setup

-   TBD

### Scene background image generation

-   This is optional, but if you would like to put a monitor behind the stage to act as a scene background, you can generate the image using Imagen 2

### Setup Irfanview for displaying background images on Windows

-   Download and install [Irfanview](https://www.irfanview.com/)
