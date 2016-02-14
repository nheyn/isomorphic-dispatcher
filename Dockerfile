# A Docker image to run the jest tests
FROM node:5

# Get needed libraries
RUN apt-get update
RUN apt-get install -y libelf1

# Create node user
RUN groupadd node && useradd -m -g node node
WORKDIR /home/node/isomorphic-dispatcher/
RUN chown node:node ./

# Get isomorphic-dispatcher files
COPY ./flowlib ./flowlib
COPY ./.flowconfig ./.flowconfig
COPY ./.babelrc ./.babelrc
COPY ./package.json	./package.json
COPY ./src ./src
COPY ./__tests__ ./__tests__
RUN chown -R node:node ./*

# Run test
USER node
RUN npm install
CMD npm run check