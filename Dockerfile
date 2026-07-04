FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and yarn.lock files to the container
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the application code to the container
COPY . .

# Build the application
RUN yarn build

# Expose the port the app runs on
EXPOSE 5001

# Define the command to run the application
CMD ["yarn", "start:api"]

