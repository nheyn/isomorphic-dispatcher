# A Docker image to run the jest tests
FROM node:5

# Get needed libraries
RUN apt-get update
RUN apt-get install -y libelf1

# Install isomorphic-dispatcher
WORKDIR /sbin/isomorphic-dispatcher/

COPY ./src /sbin/isomorphic-dispatcher/src/
COPY ./flowlib /sbin/isomorphic-dispatcher/flowlib/
COPY ./__tests__ /sbin/isomorphic-dispatcher/__tests__/
COPY ./.babelrc /sbin/isomorphic-dispatcher/.babelrc
COPY ./package.json /sbin/isomorphic-dispatcher/
RUN npm install

# Run test
CMD npm run check