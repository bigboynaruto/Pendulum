;(() => {
    var width, height; // svg dimensions

    var stop = -1, // tick to stop (negative for infinite loop)
        maxSpeed = 1, // step every maxSpeed ticks
        speed = 0; // current tick

    var pendulumCount = 3; // number of pendulums

    var t = 0, // current timestamp (x)
        theta0 = Math.PI / 3, // initial angle, amplitude
        theta = new Array(pendulumCount).fill(theta0), // current angles for each pendulum (y)
        omega = new Array(pendulumCount).fill(0), // current derivative of angle for each pendulum (z=y')
        h = 0.2; // step

    var L = 250, // pendulum length
        R = 20, // circle radius
        g = 9.8, // g-constant
        beta = Math.sqrt(g / L), // equation coefficient
        beta2 = beta * beta; // beta^2

    setDimensions(); // initialize width and height

    var distance = width / (pendulumCount + 1), // distance between pendulums
        _X_ = Array
            .apply(null, { length: pendulumCount })
            .map(Function.call, (i) => (i+1)*distance),
        _Y_ = new Array(pendulumCount).fill((height - L) / 2); // joints' coordinates

    var dataSize = 150, // plot length
        plotData = new Array(pendulumCount)
            .fill()
            .map(() => new Array()); // holds plot for each pendulum
    var circles = [
        { id: 0, color: 'red' },
        { id: 1, color: 'green' },
        { id: 2, color: 'blue' },
    ];
    var links = Array
        .apply(null, { length: pendulumCount })
        .map(Function.call, (i) => {
            return { target: circles[i] };
        });

    // BEGIN d3

    var svg = d3.select('body')
        .append('div')
        .classed('svg-container', true)
        .append('svg')
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('viewBox', '0 0 ' + width + ' ' + height)
        .classed('svg-content-responsive', true);

    // BEGIN PLOT

    var plotSvg = svg
        .append('svg')
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('viewBox', '0 0 ' + width + ' ' + height);
    var plotX = d3.scaleLinear().domain([0, dataSize]).range([0, width]),
        plotY = d3.scaleLinear().domain([-theta0, theta0]).range([0, height]);
    var plotLine = d3.line()
        .x((d,i) => {return plotX(i);})
        .y((d,i) => {return plotY(d.y);});
    var plot = plotSvg.selectAll('path')
        .data(circles)
        .enter()
        .append('path')
        .attr('d', d => plotLine(plotData[d.id]))
        .attr('fill', 'none')
        .attr('stroke', d => d.color)
        .attr('stroke-opacity', '0.3')
        .attr('stroke-width', '2px');

    // END PLOT

    var normal = svg.selectAll('line .dashed')
        .data(links)
        .enter()
        .append('line')
        .attr('x1', d => _X_[d.target.id])
        .attr('y1', d => _Y_[d.target.id])
        .attr('x2', d => _X_[d.target.id])
        .attr('y2', d => _Y_[d.target.id] + L)
        .attr('stroke', 'black')
        .attr('stroke-dasharray', '5,5')
        .classed('dashed', true);

    var line = svg.selectAll('line .solid')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', 'black')
        .attr('stroke-width', '2px')
        .attr('x1', d => _X_[d.target.id])
        .attr('y1', d => _Y_[d.target.id])
        .classed('solid', true);

    var g = svg.selectAll('g .for-circles')
        .data(circles)
        .enter()
        .append('g');
    var circle = g
        .append('circle')
        .attr('fill', d => d.color)
        .attr('stroke-width', '2px')
        .attr('stroke', d => 'dark'+d.color)
        .attr('r', R);

    var force = d3.forceSimulation();
    force.on('tick', () => {
        if (speed < maxSpeed) {
            ++speed;
            return;
        }
        speed = 0;

        next();

        var x = (i) => _X_[i] + L * Math.sin(theta[i]),
            y = (i) => _Y_[i] + L * Math.cos(theta[i]);

        plot
            .attr("d", d => plotLine(plotData[d.id])); // apply the new data values
        circle
            .attr('cx', d => x(d.id))
            .attr('cy', d => y(d.id));
        line
            .attr('x1', d => _X_[d.target.id])
            .attr('y1', d => _Y_[d.target.id])
            .attr('x2', d => x(d.target.id))
            .attr('y2', d => y(d.target.id));

        // stop if limit is reached
        if (!(~stop && t >= stop))
            d3.timer(force.restart);
    });

    // END d3

    /* Some math.
     * y'' = f(x,y,z) = -c*sin(y)
     * .
     * .
     * .
     * y' = f1(x,y,z) = z
     * z' = f2(x,y,z) = -c*sin(y)
     */
    function f1(x, y, z) {
        return z;
    };

    function f2(x, y, z) {
        return -beta2 * Math.sin(y);
        // return -beta2 * y; // gives much more synchronized with exact formula solution
    }

    function next() {
        // none
        theta[0] = theta0 * Math.cos(beta * t);

        // euler
        theta[1] += h * f1(t, theta[1], omega[1]);
        omega[1] += h * f2(t, theta[1], omega[1]);

        // runge-kutta
        var k1 = h * f1(t, theta[2], omega[2]),
            l1 = h * f2(t, theta[2], omega[2]),
            k2 = h * f1(t + h/2, theta[2] + k1/2, omega[2] + l1/2),
            l2 = h * f2(t + h/2, theta[2] + k1/2, omega[2] + l1/2),
            k3 = h * f1(t + h/2, theta[2] + k2/2, omega[2] + l2/2),
            l3 = h * f2(t + h/2, theta[2] + k2/2, omega[2] + l2/2),
            k4 = h * f1(t + h, theta[2] + k3, omega[2] + l3),
            l4 = h * f2(t + h, theta[2] + k3, omega[2] + l3);

        theta[2] += (k1 + 2*k2 + 2*k3 + k4) / 6;
        omega[2] += (l1 + 2*l2 + 2*l3 + l4) / 6;

        theta.forEach((item, i) => {
            plotData[i].push({ x: t, y: item });
            if (plotData[i].length > dataSize)
                plotData[i].shift();
        });

        t += h;
    }

    function setDimensions() {
        width = window.innerWidth;
        height = window.innerHeight;
        if ((L+R*3/2) * (pendulumCount+1) > width)
            width = (L+R*3/2)*(pendulumCount+1);
        if (2 * (L+R) > height)
            height = 2 * (L+R)
    }

    window.addEventListener('resize', () => {
        setDimensions();

        svg
            .attr('viewBox', '0 0 ' + width + ' ' + height);

        force
            .restart();

        distance = width / (pendulumCount + 1);
        _X_ = Array
            .apply(null, { length: pendulumCount })
            .map(Function.call, (i) => (i+1)*distance);
        _Y_ = new Array(pendulumCount).fill((height - L) / 2);

        plotSvg
            .attr('viewBox', '0 0 ' + width + ' ' + height);
        plotX.range([0, width]);
        plotY.range([0, height]);

        normal
            .attr('x1', d => _X_[d.target.id])
            .attr('y1', d => _Y_[d.target.id])
            .attr('x2', d => _X_[d.target.id]);
    }, false);
})();
