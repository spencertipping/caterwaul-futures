// Future implementation | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// Javascript is single-threaded and nonblocking, and has no support for first-class re-entrant continuations. This, as node.js developers know, creates a lot of explicit continuations, and it
// quickly becomes unwieldy. One way around this is to use the future monad, which still requires callbacks but manages asynchronicity in a more structured way.

// Operations on futures.
// Futures support a standard set of operations. I've changed their names to reflect Caterwaul's way of looking at expressions, but the ideas are the same:

// | var f = caterwaul.future();
//   $.getJSON('/some/url', f);
//   f.se(given.result in alert(result));

// | var g = f.map(given.result in result.foo);
//   g.se(given.foo in alert(foo));

// Unlike most futures, Caterwaul futures are variadic. This means that you can deliver multiple arguments through a future. For instance:

// | var f = caterwaul.future();
//   setTimeout(delay in f('foo', 'bar'), 100);
//   f.se(alert(x + y) -given [x, y]);         // Alerts 'foobar'

// Mapping a variadic future is simple: you just invoke this() instead of returning a value. Note that you can't invoke this() asynchronously; the return value will be used if this() isn't
// invoked within the current invocation frame.

// | var trigger = caterwaul.future();
//   var mapped  = trigger.map(given [x, y] in this(x, y, 'another'));
//   mapped.se(given [x, y, z] in alert(x + y + z));
//   trigger('hi', 'there');               // Alerts 'hithereanother'

// Perhaps most usefully, futures support various kinds of operations with respect to lists. This is the main reason I wrote this library: it eliminates the conceptual overhead of doing things
// like graph traversal over an asynchronous connection. For example:

// | load(x)            = caterwaul.future() -se- $.getJSON(x, it);
//   load_resources(xs) = caterwaul.future(xs *[load(x)] -seq);

// The array future transposes an array from the present into the future. That is, if F() is a future, it transforms [F(x1), F(x2), ..., F(xn)] into F([x1, x2, ..., xn]). This behavior is
// governed by the type of the argument to the future() constructor. Another possibility is to pass an object:

// | load_resources(o) = caterwaul.future(o %v*value[load(value)] -seq);

// Mathematically, this construct takes {k1: F(v1), k2: F(v2), ...} and returns F({k1: v1, k2: v2, ...}).

// Use as signals.
// Unlike most implementations of futures, these futures can be reused after they are decided. This means that a future can emit multiple values at different points in time, making it useful as a
// signal. Container-mapped futures do more or less the right thing with multiple invocations: It resets its state and starts waiting for the second round of entries. Any repeat entries it
// received in the meantime will be used for future invocations.

caterwaul.js_all()(function ($) {
  caterwaul.future(x) = x ? x.constructor === Object ? transpose_object(x) :
                            x.constructor === Array  ? transpose_array(x)  :
                            raise [new Error('unrecognized argument for future constructor: #{x}')] :
                        callback_future(),

  where [callback_future()             = calls_its_send_method() -se- caterwaul.merge(it, future_initials_for(it), future_operations_for(it))
                                         -where [calls_its_send_method() = f -where [f(xs = arguments) = f.send.apply(f, xs)]],

         componentwise(init, each)(xs) = result -se- each(xs, v.push(receive(k)) -given [k, v])
                                                -where [result         = caterwaul.future(),
                                                        received       = init(),
                                                        queue          = {},

                                                        enqueue(k, v)  = (queue[k] || (queue[k] = [])).push(v),
                                                        replay_queue() = queue /pairs *![receive(x[0])(x[1].shift()) -when- x[1].length] -seq,

                                                        expected_count = each(xs, ++count -delay) -re- count -where [count = 0],
                                                        received_count = 0,
                                                        receive(k)(v)  = received.hasOwnProperty(k) ?
                                                                           enqueue(k, v) :
                                                                           (received[k] = v) -re- result(received) /se   [received = init(), received_count = 0, replay_queue()]
                                                                                                                   /when [++received_count === expected_count]],

         transpose_array               = componentwise(delay in [], given [xs, f] in xs *![f(xi, x)] -seq),
         transpose_object              = componentwise(delay in {}, given [o,  f] in o /pairs *![f(x[0], x[1])] -seq),

         // call_vc = call with variadic continuation. Used to call a function with some arguments, but where 'this' is bound to a function that takes multiple arguments and forwards them
         // through the future chain. This avoids Javascript's unary continuation asymmetry (i.e, expressions return only one value but continuations take potentially many).
         call_vc(f, xs)                = f.apply(continuation, xs) -re    [continuation_result || [it]]
                                                                   -where [continuation_result          = null,
                                                                           continuation(xs = arguments) = continuation_result = Array.prototype.slice.call(xs)],
         future_initials_for(future)   = {listeners: [], decided: null},

         future_operations_for(future) = capture [push(f)              = future            -se- future.listeners.push(f)
                                                                                           -se- f.apply(future, future.decided) /when [future.decided],

                                                  map(f)               = callback_future() -se- future.push(given.nothing in it.apply(it, call_vc(f, arguments))),
                                                  flat_map(f)          = callback_future() -se- future.map(f).push(given.future in future.push(it)),

                                                  trigger(ls, xs)      = ls *![x.apply(future, xs)] -seq,

                                                  send(xs = arguments) = future -se [it.decided = xs] -se- future.trigger(future.listeners, xs)]

                                         -se [it.se = it.push, it.re = it.map]]})(caterwaul);

// Generated by SDoc 