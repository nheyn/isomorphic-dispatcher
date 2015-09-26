# A Docker image to run the jest tests
FROM iojs:3

WORKDIR /sbin/isomorphic-dispatcher/

COPY ./src /sbin/isomorphic-dispatcher/src/
COPY ./__tests__ /sbin/isomorphic-dispatcher/__tests__/
COPY ./jestEnvironment.js /sbin/isomorphic-dispatcher/
COPY ./package.json /sbin/isomorphic-dispatcher/
RUN npm install

CMD npm test
