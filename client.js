/* globals twoFactor */

const state = new ReactiveDict('twoFactor');

state.set('user', '');
state.set('password', '');
state.set('verifying', false);
state.set('method', '');

const getSelector = user => {
  if (typeof user === 'string') {
    if (user.indexOf('@') === -1) {
      return {username: user};
    }
    return {email: user};
  }
  return user;
};

const callbackHandler = (cb, handlerCb) => {
  return error => {
    if (error) {
      return typeof cb === 'function' && cb(error);
    }

    if (typeof handlerCb === 'function') {
      handlerCb();
    }

    return typeof cb === 'function' && cb();
  };
};

const getAuthCode = (user, password, method, cb) => {
  const selector = getSelector(user);
  const hashedPassword = Accounts._hashPassword(password);

  const callback = callbackHandler(cb, () => {
    state.set('verifying', true);
    state.set('user', user);
    state.set('password', hashedPassword);
    state.set('method', method);
  });

  Meteor.call(
    'twoFactor.getAuthenticationCode',
    selector,
    hashedPassword,
    method,
    callback
  );
};

const getNewAuthCode = cb => {
  const selector = getSelector(state.get('user'));
  const password = state.get('password');
  const callback = callbackHandler(cb);

  Meteor.call(
    'twoFactor.getAuthenticationCode',
    selector,
    password,
    method,
    callback
  );
};

const verifyAndLogin = (code, method = "", cb) => {
  const selector = getSelector(state.get('user'));

  Accounts.callLoginMethod({
    methodName: 'twoFactor.verifyCodeAndLogin',
    methodArguments: [{
      user: selector,
      password: state.get('password'),
      code,
      method
    }],
    userCallback: callbackHandler(cb, () => {
      state.set('verifying', false);
      state.set('user', '');
      state.set('password', '');
    })
  });
};

const isVerifying = () => state.get('verifying');

const getVerifyingMethod = () => state.get('method');

const abort = cb => {
  const selector = getSelector(state.get('user'));
  const password = state.get('password');

  const callback = callbackHandler(cb, () => {
    state.set({
      verifying: false,
      user: '',
      password: '',
    });
  });

  Meteor.call('twoFactor.abort', selector, password, callback);
};

twoFactor.getAuthCode = getAuthCode;
twoFactor.getNewAuthCode = getNewAuthCode;
twoFactor.verifyAndLogin = verifyAndLogin;
twoFactor.isVerifying = isVerifying;
twoFactor.getVerifyingMethod = getVerifyingMethod;
twoFactor.abort = abort;
