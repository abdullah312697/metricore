#!/bin/bash
#last version
# Define the project directory
PROJECT_DIR="/var/www/metricore"

# Log file
LOGFILE="$PROJECT_DIR/deploy.log"

# Function to log and print messages
log() {
  echo "$1"
  echo "$1" >> $LOGFILE
}

{
  log "Deployment started at $(date)"

  # Navigate to the project directory
  cd $PROJECT_DIR || { log "Failed to navigate to project directory"; exit 1; }

  # Fetch the latest changes from GitHub
  log "Fetching latest changes from GitHub..."
  git fetch origin || { log "Git fetch failed"; exit 1; }

  # Reset the local branch to match the remote branch, discarding remote changes
  log "Resetting local branch to match remote branch..."
  git reset --hard origin/main || { log "Git reset failed"; exit 1; }

  # Navigate to the client directory and install dependencies
  log "Navigating to client directory..."
  cd client || { log "Failed to navigate to client directory"; exit 1; }
  log "Installing client dependencies..."
  npm install || { log "Failed to install client dependencies"; exit 1; }

  # Build the React application
  log "Building the React application..."
  npm run build || { log "Client build failed"; exit 1; }

  # Navigate to the API directory and install dependencies
  log "Navigating to API directory..."
  cd ../api || { log "Failed to navigate to API directory"; exit 1; }
  log "Installing API dependencies..."
  npm install || { log "Failed to install API dependencies"; exit 1; }

  # Start or restart the backend server using PM2
  log "Starting or restarting the backend server..."
  pm2 restart api --update-env || { log "Failed to restart the backend server"; exit 1; }

  # Restart Nginx
  log "Restarting Nginx..."
  sudo systemctl restart nginx || { log "Failed to restart Nginx"; exit 1; }

  # Log the deployment
  log "Deployment complete at $(date)"

  # Send email notification
  echo "Deployment completed successfully on $(date)" | mail -s "MetriCore Deploy Successfully!" kamil.ksa25@gmail.com

  log "Deployment script completed successfully"
} | tee -a $LOGFILE
