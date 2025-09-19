        // Data structures to store tasks and dependencies
        let tasks = [];
        let dependencies = [];
        let selectedTaskId = null;
        
        // DOM elements
        const taskNameInput = document.getElementById('taskName');
        const taskDurationInput = document.getElementById('taskDuration');
        const addTaskButton = document.getElementById('addTask');
        const taskList = document.getElementById('taskList');
        const fromTaskSelect = document.getElementById('fromTask');
        const toTaskSelect = document.getElementById('toTask');
        const addDependencyButton = document.getElementById('addDependency');
        const dependencyList = document.getElementById('dependencyList');
        const visualization = document.getElementById('visualization');
        const analyzeGraphButton = document.getElementById('analyzeGraph');
        const clearAllButton = document.getElementById('clearAll');
        const topologicalOrderElement = document.getElementById('topologicalOrder');
        const criticalPathElement = document.getElementById('criticalPath');
        const adjacencyMatrixElement = document.getElementById('adjacencyMatrix');
        
        // Initialize the application
        function init() {
            addTaskButton.addEventListener('click', addTask);
            addDependencyButton.addEventListener('click', addDependency);
            analyzeGraphButton.addEventListener('click', analyzeGraph);
            clearAllButton.addEventListener('click', clearAll);
            
            // Load from localStorage if available
            loadFromLocalStorage();
            renderTasks();
            renderDependencies();
            updateTaskSelects();
            renderGraph();
        }
        
        // Add a new task
        function addTask() {
            const name = taskNameInput.value.trim();
            const duration = parseInt(taskDurationInput.value);
            
            if (!name) {
                alert('Please enter a task name');
                return;
            }
            
            if (isNaN(duration) || duration < 1) {
                alert('Please enter a valid duration');
                return;
            }
            
            const task = {
                id: Date.now().toString(),
                name,
                duration
            };
            
            tasks.push(task);
            taskNameInput.value = '';
            taskDurationInput.value = '1';
            
            saveToLocalStorage();
            renderTasks();
            updateTaskSelects();
            renderGraph();
        }
        
        // Add a dependency between tasks
        function addDependency() {
            const fromId = fromTaskSelect.value;
            const toId = toTaskSelect.value;
            
            if (!fromId || !toId) {
                alert('Please select both tasks');
                return;
            }
            
            if (fromId === toId) {
                alert('A task cannot depend on itself');
                return;
            }
            
            // Check if dependency already exists
            if (dependencies.some(d => d.from === fromId && d.to === toId)) {
                alert('This dependency already exists');
                return;
            }
            
            // Check for cycles (simplified check)
            if (wouldCreateCycle(fromId, toId)) {
                alert('This dependency would create a cycle. DAGs cannot have cycles.');
                return;
            }
            
            dependencies.push({
                from: fromId,
                to: toId
            });
            
            saveToLocalStorage();
            renderDependencies();
            renderGraph();
        }
        
        // Simple cycle detection (for demonstration purposes)
        function wouldCreateCycle(fromId, toId) {
            // If the "to" task already has a path to the "from" task, adding this would create a cycle
            return hasPath(toId, fromId);
        }
        
        // Check if there's a path from startId to targetId using DFS
        function hasPath(startId, targetId) {
            const visited = new Set();
            const stack = [startId];
            
            while (stack.length > 0) {
                const currentId = stack.pop();
                
                if (currentId === targetId) {
                    return true;
                }
                
                if (!visited.has(currentId)) {
                    visited.add(currentId);
                    
                    // Get all tasks that current task points to
                    dependencies
                        .filter(d => d.from === currentId)
                        .forEach(d => {
                            if (!visited.has(d.to)) {
                                stack.push(d.to);
                            }
                        });
                }
            }
            
            return false;
        }
        
        // Render tasks in the list
        function renderTasks() {
            taskList.innerHTML = '';
            
            tasks.forEach(task => {
                const li = document.createElement('li');
                li.className = `task-item ${selectedTaskId === task.id ? 'selected' : ''}`;
                li.innerHTML = `
                    ${task.name} (${task.duration} days)
                    <button class="delete-task" data-id="${task.id}">×</button>
                `;
                
                li.addEventListener('click', () => {
                    selectedTaskId = task.id;
                    renderTasks();
                });
                
                const deleteButton = li.querySelector('.delete-task');
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteTask(task.id);
                });
                
                taskList.appendChild(li);
            });
        }
        
        // Render dependencies in the list
        function renderDependencies() {
            dependencyList.innerHTML = '';
            
            dependencies.forEach(dep => {
                const fromTask = tasks.find(t => t.id === dep.from);
                const toTask = tasks.find(t => t.id === dep.to);
                
                if (!fromTask || !toTask) return;
                
                const li = document.createElement('li');
                li.className = 'task-item';
                li.innerHTML = `
                    ${fromTask.name} → ${toTask.name}
                    <button class="delete-dependency" data-from="${dep.from}" data-to="${dep.to}">×</button>
                `;
                
                const deleteButton = li.querySelector('.delete-dependency');
                deleteButton.addEventListener('click', () => {
                    deleteDependency(dep.from, dep.to);
                });
                
                dependencyList.appendChild(li);
            });
        }
        
        // Update task select dropdowns
        function updateTaskSelects() {
            fromTaskSelect.innerHTML = '';
            toTaskSelect.innerHTML = '';
            
            tasks.forEach(task => {
                const fromOption = document.createElement('option');
                fromOption.value = task.id;
                fromOption.textContent = task.name;
                
                const toOption = document.createElement('option');
                toOption.value = task.id;
                toOption.textContent = task.name;
                
                fromTaskSelect.appendChild(fromOption);
                toTaskSelect.appendChild(toOption);
            });
        }
        
        // Render the graph visualization
        function renderGraph() {
            visualization.innerHTML = '';
            
            if (tasks.length === 0) return;
            
            // Simple layout algorithm (for demonstration)
            const levels = topologicalSort();
            
            // Calculate positions for each task
            const nodePositions = {};
            const levelHeight = visualization.clientHeight / (levels.length + 1);
            
            levels.forEach((level, levelIndex) => {
                const levelTasks = level;
                const levelWidth = visualization.clientWidth / (levelTasks.length + 1);
                
                levelTasks.forEach((taskId, taskIndex) => {
                    const x = levelWidth * (taskIndex + 1);
                    const y = levelHeight * (levelIndex + 1);
                    
                    nodePositions[taskId] = { x, y };
                });
            });
            
            // Draw edges (dependencies)
            dependencies.forEach(dep => {
                const fromPos = nodePositions[dep.from];
                const toPos = nodePositions[dep.to];
                
                if (!fromPos || !toPos) return;
                
                // Calculate angle and distance
                const dx = toPos.x - fromPos.x;
                const dy = toPos.y - fromPos.y;
                const angle = Math.atan2(dy, dx);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Draw line
                const edge = document.createElement('div');
                edge.className = 'edge';
                edge.style.width = `${distance}px`;
                edge.style.height = '2px';
                edge.style.left = `${fromPos.x}px`;
                edge.style.top = `${fromPos.y}px`;
                edge.style.transform = `rotate(${angle}rad)`;
                visualization.appendChild(edge);
                
                // Draw arrowhead
                const arrow = document.createElement('div');
                arrow.className = 'arrow';
                arrow.style.left = `${toPos.x - Math.cos(angle) * 10}px`;
                arrow.style.top = `${toPos.y - Math.sin(angle) * 10}px`;
                arrow.style.transform = `rotate(${angle}rad)`;
                visualization.appendChild(arrow);
            });
            
            // Draw nodes (tasks)
            tasks.forEach(task => {
                if (!nodePositions[task.id]) return;
                
                const node = document.createElement('div');
                node.className = 'node';
                node.style.left = `${nodePositions[task.id].x - 30}px`;
                node.style.top = `${nodePositions[task.id].y - 30}px`;
                node.textContent = task.name;
                node.title = `${task.name} (${task.duration} days)`;
                
                node.addEventListener('click', () => {
                    selectedTaskId = task.id;
                    renderTasks();
                });
                
                visualization.appendChild(node);
            });
        }
        
        // Perform topological sort using Kahn's algorithm
        function topologicalSort() {
            if (tasks.length === 0) return [];
            
            // Calculate in-degrees
            const inDegree = {};
            tasks.forEach(task => {
                inDegree[task.id] = 0;
            });
            
            dependencies.forEach(dep => {
                inDegree[dep.to]++;
            });
            
            // Initialize queue with nodes having 0 in-degree
            const queue = [];
            tasks.forEach(task => {
                if (inDegree[task.id] === 0) {
                    queue.push(task.id);
                }
            });
            
            const result = [];
            let level = 0;
            
            while (queue.length > 0) {
                const levelSize = queue.length;
                result[level] = [];
                
                for (let i = 0; i < levelSize; i++) {
                    const currentId = queue.shift();
                    result[level].push(currentId);
                    
                    // Reduce in-degree of neighbors
                    dependencies
                        .filter(d => d.from === currentId)
                        .forEach(d => {
                            inDegree[d.to]--;
                            if (inDegree[d.to] === 0) {
                                queue.push(d.to);
                            }
                        });
                }
                
                level++;
            }
            
            return result;
        }
        
        // Calculate critical path using topological order
        function calculateCriticalPath(topologicalOrder) {
            if (tasks.length === 0) return [];
            
            // Flatten the topological order
            const flatOrder = topologicalOrder.flat();
            
            // Early start and early finish
            const earlyStart = {};
            const earlyFinish = {};
            
            // Initialize
            tasks.forEach(task => {
                earlyStart[task.id] = 0;
                earlyFinish[task.id] = task.duration;
            });
            
            // Forward pass
            flatOrder.forEach(taskId => {
                dependencies
                    .filter(d => d.to === taskId)
                    .forEach(d => {
                        if (earlyFinish[d.from] > earlyStart[taskId]) {
                            earlyStart[taskId] = earlyFinish[d.from];
                            earlyFinish[taskId] = earlyStart[taskId] + tasks.find(t => t.id === taskId).duration;
                        }
                    });
            });
            
            // Project duration
            const projectDuration = Math.max(...Object.values(earlyFinish));
            
            // Late start and late finish
            const lateFinish = {};
            const lateStart = {};
            
            // Initialize
            tasks.forEach(task => {
                lateFinish[task.id] = projectDuration;
                lateStart[task.id] = projectDuration - task.duration;
            });
            
            // Backward pass
            for (let i = flatOrder.length - 1; i >= 0; i--) {
                const taskId = flatOrder[i];
                
                dependencies
                    .filter(d => d.from === taskId)
                    .forEach(d => {
                        if (lateStart[d.to] < lateFinish[taskId]) {
                            lateFinish[taskId] = lateStart[d.to];
                            lateStart[taskId] = lateFinish[taskId] - tasks.find(t => t.id === taskId).duration;
                        }
                    });
            }
            
            // Calculate slack and identify critical path
            const criticalPath = [];
            tasks.forEach(task => {
                const slack = lateStart[task.id] - earlyStart[task.id];
                
                if (slack === 0) {
                    criticalPath.push(task.id);
                }
            });
            
            return criticalPath;
        }
        
        // Build adjacency matrix
        function buildAdjacencyMatrix() {
            const matrix = [];
            
            // Header row
            const header = ['', ...tasks.map(t => t.name)];
            matrix.push(header);
            
            // Data rows
            tasks.forEach(fromTask => {
                const row = [fromTask.name];
                
                tasks.forEach(toTask => {
                    const hasDependency = dependencies.some(d => 
                        d.from === fromTask.id && d.to === toTask.id
                    );
                    
                    row.push(hasDependency ? '1' : '0');
                });
                
                matrix.push(row);
            });
            
            return matrix;
        }
        
        // Analyze the graph and display results
        function analyzeGraph() {
            if (tasks.length === 0) {
                alert('Please add some tasks first');
                return;
            }
            
            const topologicalOrder = topologicalSort();
            const criticalPath = calculateCriticalPath(topologicalOrder);
            const adjacencyMatrix = buildAdjacencyMatrix();
            
            // Display topological order
            const topologicalNames = topologicalOrder.flat().map(id => {
                const task = tasks.find(t => t.id === id);
                return task ? task.name : id;
            });
            
            topologicalOrderElement.textContent = topologicalNames.join(' → ');
            
            // Display critical path
            const criticalPathNames = criticalPath.map(id => {
                const task = tasks.find(t => t.id === id);
                return task ? task.name : id;
            });
            
            criticalPathElement.textContent = criticalPathNames.join(' → ');
            
            // Display adjacency matrix
            let matrixHTML = '<table class="matrix-table">';
            
            adjacencyMatrix.forEach((row, rowIndex) => {
                matrixHTML += '<tr>';
                
                row.forEach((cell, cellIndex) => {
                    if (rowIndex === 0 || cellIndex === 0) {
                        matrixHTML += `<th>${cell}</th>`;
                    } else {
                        matrixHTML += `<td>${cell}</td>`;
                    }
                });
                
                matrixHTML += '</tr>';
            });
            
            matrixHTML += '</table>';
            adjacencyMatrixElement.innerHTML = matrixHTML;
            
            // Highlight critical path in visualization
            renderGraph();
            highlightCriticalPath(criticalPath);
        }
        
        // Highlight critical path in the visualization
        function highlightCriticalPath(criticalPath) {
            // Highlight nodes
            const nodes = visualization.querySelectorAll('.node');
            nodes.forEach(node => {
                const taskName = node.textContent;
                const task = tasks.find(t => t.name === taskName);
                
                if (task && criticalPath.includes(task.id)) {
                    node.classList.add('critical');
                }
            });
            
            // Highlight edges
            const edges = visualization.querySelectorAll('.edge');
            const arrows = visualization.querySelectorAll('.arrow');
            
            // For each dependency, check if both from and to are in critical path
            dependencies.forEach((dep, index) => {
                if (criticalPath.includes(dep.from) && criticalPath.includes(dep.to)) {
                    if (edges[index]) {
                        edges[index].classList.add('critical');
                    }
                    
                    if (arrows[index]) {
                        arrows[index].classList.add('critical');
                    }
                }
            });
        }
        
        // Delete a task
        function deleteTask(taskId) {
            tasks = tasks.filter(t => t.id !== taskId);
            dependencies = dependencies.filter(d => d.from !== taskId && d.to !== taskId);
            
            if (selectedTaskId === taskId) {
                selectedTaskId = null;
            }
            
            saveToLocalStorage();
            renderTasks();
            renderDependencies();
            updateTaskSelects();
            renderGraph();
        }
        
        // Delete a dependency
        function deleteDependency(fromId, toId) {
            dependencies = dependencies.filter(d => !(d.from === fromId && d.to === toId));
            
            saveToLocalStorage();
            renderDependencies();
            renderGraph();
        }
        
        // Clear all data
        function clearAll() {
            if (confirm('Are you sure you want to clear all tasks and dependencies?')) {
                tasks = [];
                dependencies = [];
                selectedTaskId = null;
                
                localStorage.removeItem('taskDependencyData');
                
                renderTasks();
                renderDependencies();
                updateTaskSelects();
                renderGraph();
                
                topologicalOrderElement.textContent = 'No analysis performed yet';
                criticalPathElement.textContent = 'No analysis performed yet';
                adjacencyMatrixElement.innerHTML = '';
            }
        }
        
        // Save data to localStorage
        function saveToLocalStorage() {
            const data = {
                tasks,
                dependencies
            };
            
            localStorage.setItem('taskDependencyData', JSON.stringify(data));
        }
        
        // Load data from localStorage
        function loadFromLocalStorage() {
            const data = localStorage.getItem('taskDependencyData');
            
            if (data) {
                const parsedData = JSON.parse(data);
                tasks = parsedData.tasks || [];
                dependencies = parsedData.dependencies || [];
            }
        }
        
        // Initialize the application
        init();
        
        // Handle window resize
        window.addEventListener('resize', renderGraph);
   