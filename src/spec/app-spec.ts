import * as _ from 'lodash';
import * as stdMocks from 'std-mocks';

import IslandKeeper from '../app';
import { replaceUri } from '../util';

function spec(fn) {
  return async done => {
    try {
      await fn();
      done();
    } catch (e) {
      done(e);
    }
  };
}

describe('replaceUri', () => {
  it('should parse mangled URI', () => {
    const result = replaceUri('GET@|:name|hello|(.)*|@commit');
    expect(result).toEqual('GET@|hello|@commit');
  });
});

// TODO : mock consul
describe('islandkeeep with consul spec', () => {
  it('초기화', done => {
    IslandKeeper.getInst().setServiceName('testIsland');
    IslandKeeper.getInst().init( {host: process.env.CONSUL_HOST || 'localhost',
                                  ns: process.env.CONSUL_NAMESPACE || 'game'} );
    if (IslandKeeper.getInst().initialized) done();
  });

  it('register Endpoint', done => {
    IslandKeeper.getInst().registerEndpoint('GET@|players|:pid', { scope: 1 });
    IslandKeeper.getInst().registerEndpoint('GET@|accounts|:pid', { scope: 2 });

    done();
    /*
    IslandKeeper.getInst().saveEndpoint().then(res => {
      done();
    }).catch(done);
    */
  });

  /*
  it('간단한 키를 저장한다', done => {
    IslandKeeper.getInst().setKey('key', {value: 1}).then(res => {
      expect(res.action).toBe('set');
      var node = IslandKeeper.parseNode(res.node);
      expect(node['key'].value).toBe(1);
      done();
    }).catch(done.fail);
  });

  it('키를 가져온다', done => {
    IslandKeeper.getInst().getKey('key').then(res => {
      expect(res.action).toBe('get');
      var node = IslandKeeper.parseNode(res.node);
      expect(node['key'].value).toBe(1);
      done();
    }).catch(done.fail);
  })

  it('키를 삭제한다', done => {
    IslandKeeper.getInst().delKey('key').then(res => {
      expect(res.action).toBe('delete');
      var prevNode = IslandKeeper.parseNode(res.prevNode);
      expect(prevNode['key'].value).toBe(1);
      IslandKeeper.getInst().getKey('key').catch(err => {
        expect(err.errorCode).toBe(100);  // not found
        done();
      });
    }).catch(done.fail);
  })

  it('디렉토리 생성', done => {
    IslandKeeper.getInst().mkdir('dir').then(res => {
      expect(res.action).toBe('set');
      expect(res.node.key).toBe('/dir');
      expect(res.node.dir).toBe(true);
      done();
    }).catch(done.fail);
  })

  it('디렉토리 삭제', done => {
    IslandKeeper.getInst().rmdir('dir', { recursive: true }).then(res => {
      expect(res.action).toBe('delete');
      done();
    }).catch(done.fail);
  })

  it('simple watcher test', done => {
    var watcher = IslandKeeper.getInst().getWatcher('key');
    watcher.once('change', (res: IResponse) => {
      var node = IslandKeeper.parseNode(res.node);
      expect(node['key']).toBe('value');
      IslandKeeper.getInst().delKey('key').then(() => done()).catch(done.fail);
    });
    IslandKeeper.getInst().setKey('key', 'value').catch(done.fail);
  })

  xit('complex watcher test', done => {
    IslandKeeper.getInst().rmdir('dir2', { recursive: true }).catch((err) => {
      expect(err.errorCode).toBe(100); // not found
    }).then(() => {
      let results: IResponse[] = [];
      var watcher = IslandKeeper.getInst().getWatcher('dir2', { recursive: true });
      watcher.on('change', (res: IResponse) => {
        results.push(res);
        if (results.length >= 7) {
          watcher.removeAllListeners();

          var sorted = _.sortBy(results, 'node.key');
          expect(sorted[0].node.key).toBe('/dir2');
          expect(sorted[0].node.dir).toBe(true);

          expect(sorted[1].node.key).toBe('/dir2/hello');
          expect(sorted[1].node.value).toBe('world');

          expect(sorted[2].node.key).toBe('/dir2/subdir1');
          expect(sorted[2].node.dir).toBe(true);

          expect(sorted[3].node.key).toBe('/dir2/subdir1/key1');
          expect(sorted[3].node.value).toBe('value1');

          expect(sorted[4].node.key).toBe('/dir2/subdir1/key2');
          expect(sorted[4].node.value).toBe('value2');

          expect(sorted[5].node.key).toBe('/dir2/subdir2');
          expect(sorted[5].node.dir).toBe(true);

          expect(sorted[6].node.key).toBe('/dir2/subdir2/key1');
          expect(sorted[6].node.value).toBe('value1');

          IslandKeeper.getInst().rmdir('dir2', { recursive: true }).then(done).catch(done.fail);
        }
      });
      Promise.all([
        IslandKeeper.getInst().mkdir('dir2'),
        IslandKeeper.getInst().setKey('dir2/hello', 'world'),
        IslandKeeper.getInst().mkdir('dir2/subdir1'),
        IslandKeeper.getInst().setKey('dir2/subdir1/key1', 'value1'),
        IslandKeeper.getInst().setKey('dir2/subdir1/key2', 'value2'),
        IslandKeeper.getInst().mkdir('dir2/subdir2'),
        IslandKeeper.getInst().setKey('dir2/subdir2/key1', 'value1')
      ]).then((res) => {
      }).catch(done.fail);
    })
  });

  it('island 등록 테스트', done => {
    let islands: Islands = {};
    let unregistered = false;
    IslandKeeper.getInst().watchIslands(x => {
      _.assign(islands, x);
      if (unregistered && !islands.hosts['bbbb']) done();
    });

    IslandKeeper.getInst().registerIsland('aaaa', { hostname: '125.141.155.151', port: 8080, pattern: '/^a$/' });
    IslandKeeper.getInst().registerIsland('bbbb', { hostname: '1.1.1.1', port: 8081, pattern: '/^b$/' });

    setTimeout(() => {
      unregistered = true;
      IslandKeeper.getInst().unregisterIsland('bbbb');
    }, 2000);
  }, 10000);

  it('api 등록 테스트', done => {
    IslandKeeper.getInst().deleteEndpoints().then(() => {
      let endpoints = {};
      // 먼저 API를 등록하고
      IslandKeeper.getInst().registerEndpoint('GET@|players|:pid', { scope: 1 }).then(() => {
        console.log('1) player 등록 완료');
        // watcher를 붙인다.
        IslandKeeper.getInst().watchEndpoints((action, name, value) => {
          endpoints[name] = value;
          console.log('3) watch 호출됨', action, name, value);
          let names = _.keys(endpoints);
          if (names.indexOf('GET@|players|:pid') >= 0 && names.indexOf('GET@|accounts|:pid') >= 0) done();
        })

        // endpoint를 1차로 가져와 등록했다고 가정하고
        IslandKeeper.getInst().getEndpoints().then(xxx => {
          console.log('2) 등록된 목록 가져오기', xxx);
          _.assign(endpoints, xxx);
          // 이미 등록된 API와 신규 API를 추가로 등록시도한다
          IslandKeeper.getInst().registerEndpoint('GET@|players|:pid', { scope: 2 }).catch(done.fail);
          IslandKeeper.getInst().registerEndpoint('GET@|accounts|:pid', { scope: 2 }).catch(done.fail);
        }).catch(done.fail);
      }).catch(done.fail);
    });
  }, 20000);
  */
});

describe('IslandKeeper#registerEndpoint', () => {
  let islandKeeper: IslandKeeper;

  async function mock(func) {
    stdMocks.use();
    await func();
    const output = stdMocks.flush();
    stdMocks.restore();
    return output;
  }

  async function expectStdoutToMatch(endpoints, newEndpoint, regexp) {
    (islandKeeper as any).promiseEndpoints = Promise.resolve(endpoints);
    const k = _.keys(newEndpoint)[0];
    const v = _.values(newEndpoint)[0];
    await islandKeeper.registerEndpoint(k, v);
    const output = await mock(async () => await islandKeeper.saveEndpoint());
    expect(output.stdout[0]).toMatch(regexp);
  }

  async function expectAsyncThrow(endpoints, newEndpoint, regexp) {
    (islandKeeper as any).promiseEndpoints = Promise.resolve(endpoints);
    const k = _.keys(newEndpoint)[0];
    const v = _.values(newEndpoint)[0];
    try {
      await islandKeeper.registerEndpoint(k, v);
      await islandKeeper.saveEndpoint();
    } catch (e) {
      expect(() => {
        throw e;
      }).toThrowError(regexp);
    }
  }

  beforeAll(() => {
    islandKeeper = IslandKeeper.getInst();
    islandKeeper.setServiceName('me');
    (islandKeeper as any).setKey = () => {};
  });

  beforeEach(() => {
    IslandKeeper.enableEndpointCheck(true);
  });

//  it('should not warn when enableCheckEndpointConflict disabled', spec(async () => {
//    IslandKeeper.enableEndpointCheck(false);
//    await expectStdoutToMatch({'GET@|:id|hello': {island: 'another'}},
//                              {'GET@|:id|hello': {island: 'me'}},
//                              /undefined/);
//    console.log('a');
//  }));

//  it('should warn by finding an exact same endpoint at the another-island', spec(async () => {
//    await expectStdoutToMatch({'GET@|:id|hello': {island: 'another'}},
//                              {'GET@|:id|hello': {island: 'me'}},
//                              /.*Did you move the endpoint to here.*/);
//  }));

//  it('should not warn with same endpoint of same island', spec(async () => {
//    await expectStdoutToMatch({'GET@|:id|hello': {island: 'me'}},
//                              {'GET@|:id|hello': {island: 'me'}},
//                              /undefined/);
//  }));

//  it('should warn by finding an equivalent endpoint of same island', spec(async () => {
//    await expectStdoutToMatch({'GET@|:id|hello': {island: 'me'}},
//                              {'GET@|:name|hello': {island: 'me'}},
//                              /.*Did you just renamed it.*/);
//  }));

//  it('should throw an exception by finding an equivalent endpoint at the another-island', spec(async () => {
//    await expectAsyncThrow({'GET@|:id|hello': {island: 'another'}},
//                           {'GET@|:name|hello': {island: 'me'}},
//                           /Different but equivalent endpoints are found.*/);
//  }));
});
