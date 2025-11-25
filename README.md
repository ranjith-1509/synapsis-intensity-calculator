# Synapsis Intensity Calculator

A React-based web application for measuring heart rate (HR) and heart rate variability (HRV) using camera-based photoplethysmography (PPG) technology. The application provides real-time heart rate monitoring, session tracking, and data visualization through an intuitive dashboard interface.

## Features

- 🔐 **User Authentication**: Secure login and signup using Firebase Authentication
- 📊 **Real-time Heart Rate Monitoring**: Measure heart rate using your device's camera
- 📈 **Heart Rate Variability (HRV) Tracking**: Monitor HRV metrics for health insights
- 📱 **Camera-based PPG**: Non-invasive heart rate measurement using photoplethysmography
- 📉 **Data Visualization**: Interactive charts and graphs using ApexCharts
- 💾 **Session Management**: Save and track your measurement sessions
- 🎨 **Modern UI**: Built with Tailwind CSS and Ant Design components
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Technologies Used

- **React** (v19.2.0) - UI framework
- **React Router DOM** (v7.9.5) - Routing and navigation
- **Firebase** (v12.5.0) - Authentication and Firestore database
- **ApexCharts** (v5.3.5) - Data visualization
- **Ant Design** (v5.28.0) - UI component library
- **Tailwind CSS** (v3.4.18) - Utility-first CSS framework
- **React Icons** (v5.5.0) - Icon library

## Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** (v14 or higher recommended)
- **npm** (v6 or higher) or **yarn**
- A modern web browser with camera access support
- A Firebase project (for authentication and database)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd synapsis-intensity-calculator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   or if you're using yarn:
   ```bash
   yarn install
   ```

3. **Configure Firebase**
   
   The Firebase configuration is currently set in `src/firebaseConfig.js`. If you need to use your own Firebase project:
   
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Update the `firebaseConfig` object in `src/firebaseConfig.js` with your Firebase credentials:
     ```javascript
     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID",
       measurementId: "YOUR_MEASUREMENT_ID"
     };
     ```

## Running the Application

### Development Mode

To start the development server:

```bash
npm start
```

The application will open in your browser at [http://localhost:3000](http://localhost:3000).

The page will automatically reload when you make changes to the code. Any lint errors will appear in the console.

### Production Build

To create a production build:

```bash
npm run build
```

This creates an optimized production build in the `build` folder. The build is minified and ready for deployment.

### Running Tests

To run the test suite:

```bash
npm test
```

This launches the test runner in interactive watch mode.

## Project Structure

```
synapsis-intensity-calculator/
├── public/                 # Static files
│   ├── index.html
│   └── ...
├── src/
│   ├── Components/         # React components
│   │   ├── Auth/          # Authentication components
│   │   │   ├── AuthForm.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Signup.jsx
│   │   ├── dashboard/     # Dashboard components
│   │   │   ├── MetricCard.jsx
│   │   │   └── RecentSection.jsx
│   │   ├── ui/            # Reusable UI components
│   │   │   ├── PrimaryButton.jsx
│   │   │   └── StartScanModal.jsx
│   │   ├── Dashboard.jsx
│   │   ├── HeartRateMeasuring.jsx  # Main HR measurement component
│   │   ├── Opencamera.js           # Camera handling
│   │   ├── PrivateRoute.jsx        # Protected route wrapper
│   │   └── SessionDetail.jsx       # Session details view
│   ├── Utils/             # Utility functions
│   │   └── hrUtils.js     # Heart rate calculation utilities
│   ├── images/            # Image assets
│   ├── App.js             # Main app component with routing
│   ├── firebaseConfig.js  # Firebase configuration
│   ├── index.js           # Entry point
│   └── index.css          # Global styles
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Usage

1. **Sign Up / Login**: Create an account or log in with existing credentials
2. **Access Dashboard**: View your recent sessions and metrics
3. **Start Measurement**: Click "Start Scan" to begin a heart rate measurement session
4. **Camera Access**: Grant camera permissions when prompted
5. **Position Finger**: Place your finger over the camera lens (for front camera) or position yourself in front of the camera
6. **Monitor**: Watch real-time heart rate and HRV metrics
7. **Save Session**: Save your measurement session for future reference
8. **View History**: Access past sessions from the dashboard

## Browser Compatibility

The application works best on modern browsers that support:
- Camera API (getUserMedia)
- ES6+ JavaScript features
- CSS Grid and Flexbox

Recommended browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Important Notes

- **Camera Permissions**: The application requires camera access to measure heart rate. Make sure to grant camera permissions when prompted.
- **Lighting Conditions**: For best results, ensure adequate lighting when using the camera for heart rate measurement.
- **Privacy**: All user data is stored securely in Firebase. Ensure you comply with privacy regulations when deploying this application.

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (one-way operation)

## Troubleshooting

### Camera not working
- Ensure you've granted camera permissions in your browser
- Check if another application is using the camera
- Try refreshing the page

### Firebase connection issues
- Verify your Firebase configuration in `src/firebaseConfig.js`
- Check if your Firebase project has Authentication and Firestore enabled
- Ensure your Firebase project billing is enabled (required for Firestore)

### Build errors
- Delete `node_modules` and `package-lock.json`, then run `npm install` again
- Ensure you're using a compatible Node.js version

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.

## Support

For issues and questions, please contact the development team or create an issue in the repository.
