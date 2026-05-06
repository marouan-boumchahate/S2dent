String getInitials(String name) => name.isNotEmpty
    ? name.trim().split(' ').map((l) => l[0]).take(2).join().toUpperCase()
    : '';
