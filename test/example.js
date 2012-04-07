$(caterwaul('js_all jquery')(function () {
  $('body').append(simple_example, mapped_example, array_example, object_example)

  -where [example(name, contents) = jquery in div.example(h1[name], div.contents[contents]),

          future_ui(f, value)           = jquery [div.future.decidable /text('<click to send #{JSON.stringify(value)}>')]
                                          -se- f.push(given.value in it.removeClass('decidable').addClass('decided').text(JSON.stringify(value)))
                                          -se- it.click("f(value)".qf),

          future_output(f)              = jquery [div.future /text('<undecided>')]
                                          -se- f.push(given.value in it.addClass('decided').text(JSON.stringify(value))),

          simple_example                = example('caterwaul.future()', future_ui(caterwaul.future(), 'hello')),

          mapped_example                = example('g = f.map(given.x in x + 1)',

                                                  jquery [table(tr(th('f'),              th('g')),
                                                                tr(td[future_ui(f, 10)], td[future_output(g)]))]

                                                  -where [f = caterwaul.future(),
                                                          g = f.map(given.x in x + 1)]),

          array_example                 = example('f = caterwaul.future([f1, f2, f3])',

                                                  jquery [table(tr(th('f1'),             th('f2'),             th('f3'),             th('f')),
                                                                tr(td[future_ui(f1, 5)], td[future_ui(f2, 6)], td[future_ui(f3, 7)], td[future_output(f)]))]

                                                  -where [f1 = caterwaul.future(),
                                                          f2 = caterwaul.future(),
                                                          f3 = caterwaul.future(),
                                                          f  = caterwaul.future([f1, f2, f3])]),

          object_example                = example('f = caterwaul.future({foo: foo, bar: bar})',

                                                  jquery [table(tr(th('foo'),                th('bar'),                   th('f')),
                                                                tr(td[future_ui(foo, 'hi')], td[future_ui(bar, 'there')], td[future_output(f)]))]

                                                  -where [foo = caterwaul.future(),
                                                          bar = caterwaul.future(),
                                                          f   = caterwaul.future({foo: foo, bar: bar})])]}));
